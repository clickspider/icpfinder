// SPDX-License-Identifier: MIT

import { mkdtemp, readFile, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { subscriptionEnv } from "../src/main/cli";
import {
  allowedAuthUrl,
  SubscriptionAuth,
  type SubscriptionAuthOptions,
} from "../src/main/subscription-auth";

const roots: string[] = [];
async function setup(overrides: Partial<SubscriptionAuthOptions> = {}) {
  const root = await mkdtemp(join(tmpdir(), "icpfinder-auth-"));
  roots.push(root);
  return {
    root,
    auth: new SubscriptionAuth({
      root,
      openExternal: vi.fn(async () => {}),
      encrypt: (value) => Buffer.from(value.toString("base64")),
      decrypt: (value) => Buffer.from(value.toString(), "base64"),
      encryptionAvailable: () => true,
      resolveCli: async (name) => `/bin/${name}`,
      runCli: async (_binary, args) => ({
        code: 0,
        output:
          args[0] === "auth"
            ? JSON.stringify({ loggedIn: true, authMethod: "claude.ai" })
            : "Logged in using ChatGPT",
      }),
      ...overrides,
    }),
  };
}
afterEach(async () => {
  vi.useRealTimers();
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});
const response = (value: object, status = 200) => new Response(JSON.stringify(value), { status });

describe("subscription account service", () => {
  it("only identifies subscription auth, never API-key auth", async () => {
    const { auth } = await setup();
    expect((await auth.status()).map((s) => s.connected)).toEqual([true, true, false]);
    const api = await setup({
      runCli: async (binary) => ({
        code: 0,
        output: binary.endsWith("claude")
          ? JSON.stringify({ loggedIn: true, authMethod: "api_key" })
          : "Logged in using an API key",
      }),
    });
    expect((await api.auth.status()).every((s) => !s.connected)).toBe(true);
  });
  it("strips API credentials and routing overrides without mutating parent env", () => {
    const source = {
      PATH: "/bin",
      HOME: "/home/test",
      OPENAI_API_KEY: "secret",
      ANTHROPIC_AUTH_TOKEN: "secret",
      CLAUDE_CODE_OAUTH_TOKEN: "secret",
      OPENAI_BASE_URL: "https://other",
      CLAUDE_CODE_USE_BEDROCK: "1",
      CLAUDECODE: "1",
    };
    expect(subscriptionEnv(source)).toEqual({ PATH: "/bin", HOME: "/home/test" });
    expect(source.OPENAI_API_KEY).toBe("secret");
  });
  it("rejects browser destinations outside the provider allowlist", () => {
    for (const url of [
      "http://accounts.x.ai",
      "https://accounts.x.ai.attacker.test",
      "https://user@accounts.x.ai",
      "https://accounts.x.ai:444",
      "javascript:alert(1)",
    ])
      expect(allowedAuthUrl("xai", url)).toBe(false);
    expect(allowedAuthUrl("xai", "https://accounts.x.ai/oauth2/device?user_code=ABCD")).toBe(true);
  });
  it("cancels before slow CLI discovery completes and never spawns a login", async () => {
    let release!: (path: string) => void;
    const run = vi.fn();
    const { auth } = await setup({
      resolveCli: () =>
        new Promise((resolve) => {
          release = resolve;
        }),
      runCli: run,
    });
    const attempt = await auth.begin("claude");
    auth.cancel(attempt.id);
    release("/bin/claude");
    await new Promise((resolve) => setImmediate(resolve));
    expect(run).not.toHaveBeenCalled();
    expect(auth.loginState(attempt.id).status).toBe("cancelled");
  });
  it("does not expose raw CLI failures", async () => {
    const { auth } = await setup({
      runCli: async () => {
        throw new Error("secret-access-token");
      },
    });
    const attempt = await auth.begin("codex");
    await new Promise((resolve) => setImmediate(resolve));
    expect(auth.loginState(attempt.id).status).toBe("failed");
    expect(JSON.stringify(auth.loginState(attempt.id))).not.toContain("secret-access-token");
  });
  it("stores device tokens encrypted with private permissions, refreshes once, and disconnects", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        response({
          verification_uri: "https://accounts.x.ai/oauth2/device",
          user_code: "CODE",
          device_code: "private-device",
          interval: 1,
        })
      )
      .mockResolvedValueOnce(
        response({
          access_token: "private-access",
          refresh_token: "private-refresh",
          expires_in: 120,
        })
      )
      .mockResolvedValueOnce(
        response({
          access_token: "rotated-access",
          refresh_token: "rotated-refresh",
          expires_in: 3600,
        })
      );
    const { auth, root } = await setup({ fetch: request });
    const attempt = await auth.begin("xai");
    await vi.waitFor(() => expect(auth.loginState(attempt.id).code).toBe("CODE"));
    await vi.advanceTimersByTimeAsync(1000);
    await vi.waitFor(() => expect(auth.loginState(attempt.id).status).toBe("complete"));
    const path = join(root, "subscription-xai.enc");
    expect((await readFile(path)).toString()).not.toContain("private-access");
    expect((await stat(path)).mode & 0o777).toBe(0o600);
    expect(await auth.xaiToken()).toBe("private-access");
    await vi.advanceTimersByTimeAsync(61000);
    expect(await Promise.all([auth.xaiToken(), auth.xaiToken()])).toEqual([
      "rotated-access",
      "rotated-access",
    ]);
    expect(request).toHaveBeenCalledTimes(3);
    await auth.disconnect("xai");
    expect((await auth.status()).find((s) => s.provider === "xai")?.connected).toBe(false);
  });
  it("late device responses cannot revive cancelled sign-in", async () => {
    let release!: (response: Response) => void;
    const open = vi.fn(async () => {});
    const { auth } = await setup({
      fetch: () =>
        new Promise((resolve) => {
          release = resolve;
        }),
      openExternal: open,
    });
    const attempt = await auth.begin("xai");
    auth.cancel(attempt.id);
    release(
      response({
        verification_uri: "https://accounts.x.ai/oauth2/device",
        user_code: "CODE",
        device_code: "private",
      })
    );
    await new Promise((resolve) => setImmediate(resolve));
    expect(auth.loginState(attempt.id).status).toBe("cancelled");
    expect(open).not.toHaveBeenCalled();
  });
});

async function saved(root: string, expires = Date.now() - 1000) {
  await writeFile(
    join(root, "subscription-xai.enc"),
    Buffer.from(JSON.stringify({ access: "old-access", refresh: "old-refresh", expires })).toString(
      "base64"
    )
  );
}
describe("auth edge cases", () => {
  it("preserves Codex home while stripping provider configuration and process injection", () => {
    expect(
      subscriptionEnv({
        CODEX_HOME: "/accounts/me",
        CODEX_CONFIG: "bad",
        ANTHROPIC_MODEL: "bad",
        CLAUDE_CONFIG_DIR: "bad",
        NODE_OPTIONS: "--require=bad",
        PATH: "/bin",
      })
    ).toEqual({ CODEX_HOME: "/accounts/me", PATH: "/bin" });
  });
  it("reports failed expired-token refresh as disconnected with sanitized errors", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(response({ error: "private-refresh-secret" }, 400));
    const { auth, root } = await setup({ fetch: request });
    await saved(root);
    const status = (await auth.status()).find((s) => s.provider === "xai");
    expect(status?.connected).toBe(false);
    expect(status?.error).not.toContain("private-refresh-secret");
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("refuses symlinks and oversized credential files before decryption", async () => {
    const decrypt = vi.fn((value: Buffer) => value);
    const { auth, root } = await setup({ decrypt });
    await writeFile(join(root, "target"), "private");
    await symlink(join(root, "target"), join(root, "subscription-xai.enc"));
    await expect(auth.xaiToken()).rejects.toThrow("unavailable");
    await rm(join(root, "subscription-xai.enc"));
    await writeFile(join(root, "subscription-xai.enc"), Buffer.alloc(65537));
    await expect(auth.xaiToken()).rejects.toThrow("unavailable");
    expect(decrypt).not.toHaveBeenCalled();
  });
  it("does not start OAuth without encrypted storage", async () => {
    const request = vi.fn<typeof fetch>();
    const { auth } = await setup({ encryptionAvailable: () => false, fetch: request });
    const attempt = await auth.begin("xai");
    await new Promise((resolve) => setImmediate(resolve));
    expect(auth.loginState(attempt.id).status).toBe("failed");
    expect(request).not.toHaveBeenCalled();
  });
  it("times out and clears the browser link, ignoring late CLI output", async () => {
    vi.useFakeTimers();
    let emit: ((text: string) => void) | undefined;
    const { auth } = await setup({
      timeoutMs: 100,
      runCli: async (_binary, _args, signal, output) => {
        emit = output;
        output?.("https://auth.openai.com/authorize?state=private");
        return new Promise((_resolve, reject) =>
          signal.addEventListener("abort", () => reject(new Error("secret")), { once: true })
        );
      },
    });
    const attempt = await auth.begin("codex");
    await vi.advanceTimersByTimeAsync(100);
    emit?.("https://auth.openai.com/authorize?state=late");
    expect(auth.loginState(attempt.id)).toMatchObject({
      status: "failed",
      error: "Sign-in timed out. Try again.",
    });
    expect(auth.loginState(attempt.id).url).toBeUndefined();
  });
  it("respects slow_down and erases device codes after completion", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        response({
          verification_uri: "https://accounts.x.ai/oauth2/device",
          user_code: "CODE",
          device_code: "device",
          interval: 1,
        })
      )
      .mockResolvedValueOnce(response({ error: "slow_down" }, 400))
      .mockResolvedValueOnce(response({ access_token: "access", refresh_token: "refresh" }));
    const { auth } = await setup({ fetch: request });
    const attempt = await auth.begin("xai");
    await vi.waitFor(() => expect(auth.loginState(attempt.id).code).toBe("CODE"));
    await vi.advanceTimersByTimeAsync(1000);
    expect(request).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(5000);
    expect(request).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1000);
    await vi.waitFor(() => expect(auth.loginState(attempt.id).status).toBe("complete"));
    expect(auth.loginState(attempt.id).code).toBeUndefined();
    expect(auth.loginState(attempt.id).url).toBeUndefined();
  });
  it("disconnect invalidates a late refresh and cannot recreate the credential file", async () => {
    let release!: (value: Response) => void;
    const request = vi.fn<typeof fetch>(
      () =>
        new Promise((resolve) => {
          release = resolve;
        })
    );
    const { auth, root } = await setup({ fetch: request });
    await saved(root);
    const refresh = auth.xaiToken();
    const rejected = expect(refresh).rejects.toThrow("unavailable");
    await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    await auth.disconnect("xai");
    release(response({ access_token: "late", refresh_token: "late" }));
    await rejected;
    await expect(readFile(join(root, "subscription-xai.enc"))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });
  it("new login invalidates an old refresh promise without letting it clear the new one", async () => {
    let release!: (value: Response) => void;
    const request = vi
      .fn<typeof fetch>()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            release = resolve;
          })
      )
      .mockResolvedValueOnce(response({ error: "denied" }, 400))
      .mockResolvedValueOnce(response({ access_token: "new", refresh_token: "new" }));
    const { auth, root } = await setup({ fetch: request });
    await saved(root);
    const old = auth.xaiToken();
    const rejected = expect(old).rejects.toThrow("unavailable");
    await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    const attempt = await auth.begin("xai");
    await vi.waitFor(() => expect(auth.loginState(attempt.id).status).toBe("failed"));
    expect(await auth.xaiToken()).toBe("new");
    release(response({ access_token: "stale", refresh_token: "stale" }));
    await rejected;
    expect(await auth.xaiToken()).toBe("new");
  });
});
