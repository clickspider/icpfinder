// SPDX-License-Identifier: MIT
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { constants, renameSync, rmSync } from "node:fs";
import { mkdir, open, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  ConnectionFailure,
  LoginAttempt,
  ProviderId,
  SubscriptionStatus,
} from "../shared/subscriptions";
import { resolveCli, subscriptionEnv } from "./cli";

const CLIENT = "b1a00492-073a-47ea-816f-4c329264a828";
const SCOPE = "openid profile email offline_access grok-cli:access api:access";
type Json = Record<string, unknown>;
type Credential = { access: string; refresh: string; expires: number };
export type CliRunner = (
  binary: string,
  args: string[],
  signal: AbortSignal,
  output?: (text: string) => void
) => Promise<{ code: number; output: string }>;
export interface SubscriptionAuthOptions {
  root: string;
  openExternal: (url: string) => Promise<unknown>;
  encrypt: (value: Buffer) => Buffer;
  decrypt: (value: Buffer) => Buffer;
  encryptionAvailable: () => boolean;
  resolveCli?: typeof resolveCli;
  runCli?: CliRunner;
  fetch?: typeof fetch;
  timeoutMs?: number;
}

class ConnectionError extends Error {
  constructor(readonly failure: ConnectionFailure) {
    super(failure);
  }
}
const runCli: CliRunner = (binary, args, signal, onOutput) =>
  new Promise((resolve, reject) => {
    const child = spawn(binary, args, {
      env: subscriptionEnv(),
      stdio: ["pipe", "pipe", "pipe"],
      signal,
    });
    let output = "";
    const collect = (chunk: Buffer) => {
      output = (output + chunk.toString()).slice(-65536);
      onOutput?.(output);
    };
    child.stdout.on("data", collect);
    child.stderr.on("data", collect);
    child.on("error", () => reject(new ConnectionError("component")));
    child.on("close", (code) => resolve({ code: code ?? 1, output }));
  });

export function allowedAuthUrl(provider: ProviderId, value: string): boolean {
  try {
    const url = new URL(value);
    const hosts =
      provider === "xai"
        ? ["accounts.x.ai"]
        : provider === "claude"
          ? ["claude.ai", "claude.com", "platform.claude.com", "console.anthropic.com"]
          : ["auth.openai.com", "auth0.openai.com"];
    return (
      url.protocol === "https:" &&
      hosts.includes(url.hostname) &&
      !url.username &&
      !url.password &&
      (!url.port || url.port === "443")
    );
  } catch {
    return false;
  }
}

export class SubscriptionAuth {
  private attempts = new Map<string, LoginAttempt>();
  private active = new Map<ProviderId, { id: string; controller: AbortController }>();
  private refresh?: { promise: Promise<string>; controller: AbortController; generation: number };
  private generation = 0;
  private readonly file: string;
  constructor(private options: SubscriptionAuthOptions) {
    this.file = join(options.root, "subscription-xai.enc");
  }
  private get runner() {
    return this.options.runCli ?? runCli;
  }
  private get resolver() {
    return this.options.resolveCli ?? resolveCli;
  }

  async status(): Promise<SubscriptionStatus[]> {
    return Promise.all(
      (["claude", "codex", "xai"] as const).map(async (provider) => {
        if (provider === "xai") {
          try {
            const credential = await this.read();
            if (credential) await this.xaiToken();
            return {
              provider,
              installed: true,
              connected: !!credential,
              label: credential ? "Grok account" : undefined,
            };
          } catch {
            return {
              provider,
              installed: true,
              connected: false,
              error: "Saved Grok sign-in is unavailable. Sign in again.",
            };
          }
        }
        const binary = await this.resolver(provider);
        if (!binary) return { provider, installed: false, connected: false, failure: "component" };
        try {
          const result = await this.runner(
            binary,
            provider === "claude" ? ["auth", "status", "--json"] : ["login", "status"],
            AbortSignal.timeout(10000)
          );
          let connected = false;
          if (provider === "claude") {
            const parsed = JSON.parse(result.output) as Json;
            connected =
              result.code === 0 && parsed.loggedIn === true && parsed.authMethod === "claude.ai";
          } else connected = result.code === 0 && /logged in using chatgpt/i.test(result.output);
          return {
            provider,
            installed: true,
            connected,
            label: connected
              ? provider === "claude"
                ? "Claude subscription"
                : "ChatGPT account"
              : undefined,
          };
        } catch (error) {
          return {
            provider,
            installed: true,
            failure: error instanceof ConnectionError ? error.failure : "temporary",
            connected: false,
            error: "Could not check sign-in. Try again.",
          };
        }
      })
    );
  }

  async begin(provider: ProviderId): Promise<LoginAttempt> {
    if (!["claude", "codex", "xai"].includes(provider)) throw new Error("Unsupported provider.");
    const previous = this.active.get(provider);
    if (previous) this.cancel(previous.id);
    if (provider === "xai") this.invalidateRefresh();
    const attempt: LoginAttempt = { id: randomUUID(), provider, status: "pending" };
    const controller = new AbortController();
    this.attempts.set(attempt.id, attempt);
    this.active.set(provider, { id: attempt.id, controller });
    // Keep a bounded history without removing a pending attempt.
    if (this.attempts.size > 50) {
      for (const [id, old] of this.attempts)
        if (old.status !== "pending") {
          this.attempts.delete(id);
          break;
        }
    }
    // The UI polls this pending attempt; complete records every failure on the attempt.
    void this.complete(attempt, controller);
    return { ...attempt };
  }
  loginState(id: string): LoginAttempt {
    const attempt = this.attempts.get(id);
    if (!attempt) throw new Error("Unknown sign-in attempt.");
    return { ...attempt };
  }
  cancel(id: string): void {
    const attempt = this.attempts.get(id);
    if (attempt?.status !== "pending") return;
    attempt.status = "cancelled";
    delete attempt.url;
    delete attempt.code;
    const active = this.active.get(attempt.provider);
    if (active?.id === id) {
      active.controller.abort();
      this.active.delete(attempt.provider);
    }
  }
  private async complete(attempt: LoginAttempt, controller: AbortController): Promise<void> {
    const timer = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 600000);
    try {
      if (attempt.provider === "xai") await this.device(attempt, controller.signal);
      else {
        const binary = await this.resolver(attempt.provider);
        controller.signal.throwIfAborted();
        if (!binary) throw new ConnectionError("component");
        const result = await this.runner(
          binary,
          attempt.provider === "claude" ? ["auth", "login", "--claudeai"] : ["login"],
          controller.signal,
          (output) => {
            if (controller.signal.aborted || attempt.status !== "pending") return;
            // biome-ignore lint/suspicious/noControlCharactersInRegex: CLI ANSI escapes must terminate a URL.
            for (const candidate of output.match(/https:\/\/[^\s<>"\x1b]+/g) ?? []) {
              if (allowedAuthUrl(attempt.provider, candidate)) {
                attempt.url = candidate;
                break;
              }
            }
          }
        );
        controller.signal.throwIfAborted();
        if (result.code !== 0) throw new Error("login");
        const statuses = await this.status();
        if (!statuses.find((s) => s.provider === attempt.provider)?.connected)
          throw new Error("subscription");
      }
      controller.signal.throwIfAborted();
      if (attempt.status === "pending") attempt.status = "complete";
    } catch (error) {
      if (attempt.status === "pending") {
        attempt.failure =
          error instanceof ConnectionError
            ? error.failure
            : controller.signal.aborted
              ? "temporary"
              : "signin";
        attempt.status = "failed";
        attempt.error = controller.signal.aborted
          ? "Sign-in timed out. Try again."
          : "Sign-in could not complete. Please try again.";
      }
    } finally {
      clearTimeout(timer);
      delete attempt.url;
      delete attempt.code;
      if (this.active.get(attempt.provider)?.id === attempt.id)
        this.active.delete(attempt.provider);
    }
  }
  private async request(
    path: string,
    params: Record<string, string>,
    signal: AbortSignal
  ): Promise<{ ok: boolean; body: Json }> {
    const response = await (this.options.fetch ?? fetch)(`https://auth.x.ai/oauth2/${path}`, {
      method: "POST",
      redirect: "error",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params),
      signal: AbortSignal.any([signal, AbortSignal.timeout(25000)]),
    }).catch(() => {
      throw new ConnectionError("temporary");
    });
    const text = await response.text();
    if (text.length > 65536) throw new Error("Invalid provider response.");
    const body: unknown = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new Error("Invalid provider response.");
    return { ok: response.ok, body: body as Json };
  }
  private async device(attempt: LoginAttempt, signal: AbortSignal): Promise<void> {
    if (!this.options.encryptionAvailable()) throw new Error("Secure storage unavailable.");
    const { ok, body } = await this.request(
      "device/code",
      { client_id: CLIENT, scope: SCOPE, referrer: "icpfinder" },
      signal
    );
    signal.throwIfAborted();
    const url = body.verification_uri_complete ?? body.verification_uri;
    if (
      !ok ||
      typeof url !== "string" ||
      !allowedAuthUrl("xai", url) ||
      typeof body.user_code !== "string" ||
      typeof body.device_code !== "string"
    )
      throw new Error("Invalid device response.");
    attempt.url = url;
    attempt.code = body.user_code;
    await this.options.openExternal(url);
    let interval = typeof body.interval === "number" ? Math.max(1, body.interval) : 5;
    const expires =
      Date.now() +
      Math.min(typeof body.expires_in === "number" ? body.expires_in : 600, 1800) * 1000;
    while (Date.now() < expires) {
      await new Promise<void>((resolve, reject) => {
        signal.throwIfAborted();
        const abort = () => {
          clearTimeout(timer);
          reject(new Error("Cancelled."));
        };
        const timer = setTimeout(() => {
          signal.removeEventListener("abort", abort);
          resolve();
        }, interval * 1000);
        signal.addEventListener("abort", abort, { once: true });
      });
      const result = await this.request(
        "token",
        {
          grant_type: "urn:ietf:params:oauth:grant-type:device_code",
          client_id: CLIENT,
          device_code: body.device_code,
        },
        signal
      );
      signal.throwIfAborted();
      if (result.ok) {
        await this.save(this.credential(result.body), () => signal.throwIfAborted());
        return;
      }
      if (result.body.error === "authorization_pending") continue;
      if (result.body.error === "slow_down") {
        interval += 5;
        continue;
      }
      throw new Error("Device authorization failed.");
    }
    throw new Error("Device authorization expired.");
  }
  private credential(body: Json, oldRefresh?: string): Credential {
    if (
      typeof body.access_token !== "string" ||
      !body.access_token ||
      !(typeof body.refresh_token === "string" ? body.refresh_token : oldRefresh)
    )
      throw new Error("Invalid credentials.");
    // xAI may omit expiry; revalidate via refresh after one hour.
    const seconds =
      typeof body.expires_in === "number" && body.expires_in > 0 ? body.expires_in : 3600;
    return {
      access: body.access_token,
      refresh: typeof body.refresh_token === "string" ? body.refresh_token : (oldRefresh ?? ""),
      expires: Date.now() + seconds * 1000,
    };
  }
  private async read(): Promise<Credential | null> {
    if (!this.options.encryptionAvailable()) throw new Error("Secure storage unavailable.");
    let data: Buffer;
    try {
      const handle = await open(this.file, constants.O_RDONLY | constants.O_NOFOLLOW);
      try {
        const info = await handle.stat();
        if (!info.isFile() || info.size > 65536) throw new Error("Invalid sign-in file.");
        const bounded = Buffer.alloc(65537);
        const { bytesRead } = await handle.read(bounded, 0, bounded.length, 0);
        if (bytesRead > 65536) throw new Error("Invalid sign-in file.");
        data = bounded.subarray(0, bytesRead);
      } finally {
        await handle.close();
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw new Error("Cannot read sign-in.");
    }
    const value = JSON.parse(this.options.decrypt(data).toString()) as Credential;
    if (
      !value ||
      typeof value.access !== "string" ||
      !value.access ||
      typeof value.refresh !== "string" ||
      !value.refresh ||
      typeof value.expires !== "number" ||
      !Number.isFinite(value.expires)
    )
      throw new Error("Invalid saved sign-in.");
    return value;
  }
  private async save(credential: Credential, check: () => void): Promise<void> {
    if (!this.options.encryptionAvailable()) throw new Error("Secure storage unavailable.");
    const encrypted = this.options.encrypt(Buffer.from(JSON.stringify(credential)));
    await mkdir(this.options.root, { recursive: true, mode: 0o700 });
    const temp = `${this.file}.${randomUUID()}.tmp`;
    try {
      await writeFile(temp, encrypted, { mode: 0o600, flag: "wx" });
      check();
      renameSync(temp, this.file);
    } finally {
      await rm(temp, { force: true });
    }
  }
  private invalidateRefresh(): void {
    this.generation++;
    this.refresh?.controller.abort();
    this.refresh = undefined;
  }
  async xaiToken(): Promise<string> {
    if (this.active.has("xai")) throw new Error("Grok sign-in is in progress.");
    if (this.refresh?.generation === this.generation) return this.refresh.promise;
    const generation = this.generation;
    const controller = new AbortController();
    const check = () => {
      controller.signal.throwIfAborted();
      if (generation !== this.generation) throw new Error("Sign-in changed.");
    };
    const promise = (async () => {
      try {
        const current = await this.read();
        check();
        if (!current) throw new Error("missing");
        if (current.expires > Date.now() + 60000) return current.access;
        const result = await this.request(
          "token",
          { grant_type: "refresh_token", client_id: CLIENT, refresh_token: current.refresh },
          controller.signal
        );
        check();
        if (!result.ok) throw new Error("refresh");
        const next = this.credential(result.body, current.refresh);
        await this.save(next, check);
        check();
        return next.access;
      } catch {
        throw new Error("Grok sign-in is unavailable. Sign in again.");
      }
    })();
    this.refresh = { promise, controller, generation };
    try {
      return await promise;
    } finally {
      if (this.refresh?.promise === promise) this.refresh = undefined;
    }
  }
  async disconnect(provider: "xai"): Promise<void> {
    if (provider !== "xai") throw new Error("Only Grok can be disconnected here.");
    const active = this.active.get("xai");
    if (active) this.cancel(active.id);
    this.invalidateRefresh();
    rmSync(this.file, { force: true });
  }
}
