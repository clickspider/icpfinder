import { type ChildProcess, spawn } from "node:child_process";
import {
  ClaudeCliLlmProvider,
  type CliUsage,
  type GenerateInput,
  type GenerateResult,
  type LlmProvider,
} from "@icpfinder/providers";
import type { ProviderId } from "../shared/subscriptions";
import { resolveCli, subscriptionEnv } from "./cli";

export interface RuntimeOptions {
  provider: ProviderId;
  model: string;
  cwd: string;
  xaiToken: () => Promise<string>;
  onSpawn?: (child: ChildProcess) => void;
  onUsage?: (provider: ProviderId, usage: CliUsage) => void;
  signal?: AbortSignal;
}

const result = (provider: string, text: string): GenerateResult => ({
  text,
  stub: false,
  cost: { provider, endpoint: "subscription", costCents: 0, units: 0 },
});

/** Only protocol events count as a Codex result, never stderr or a failed turn. */
export function parseCodexOutput(raw: string, model: string): { text: string; usage: CliUsage } {
  let text = "";
  let complete = false;
  const usage: CliUsage = {
    model: model || "codex-default",
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    webSearches: 0,
    costUsd: 0,
    ms: 0,
  };
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    let event: {
      type?: string;
      item?: { type?: string; text?: string };
      usage?: { input_tokens?: number; output_tokens?: number; cached_input_tokens?: number };
    };
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }
    if (event.type === "turn.failed" || event.type === "error")
      throw new Error(
        "Codex could not complete the request. Check your subscription and try again."
      );
    if (event.type === "item.completed" && event.item?.type === "agent_message")
      text = event.item.text ?? "";
    if (event.type === "item.completed" && event.item?.type === "web_search") usage.webSearches++;
    if (event.type === "turn.completed") {
      complete = true;
      usage.cacheRead = event.usage?.cached_input_tokens ?? 0;
      usage.input = Math.max(0, (event.usage?.input_tokens ?? 0) - usage.cacheRead);
      usage.output = event.usage?.output_tokens ?? 0;
    }
  }
  if (!complete || !text.trim()) throw new Error("Codex returned no completed answer.");
  return { text: text.trim(), usage };
}

export function codexArgs(input: GenerateInput, model: string): string[] {
  return [
    "-a",
    "never",
    "exec",
    "--ignore-user-config",
    "--skip-git-repo-check",
    "--ephemeral",
    "--sandbox",
    "read-only",
    "--json",
    "--color",
    "never",
    "-c",
    'model_provider="openai"',
    "-c",
    `web_search="${input.grounding ? "live" : "disabled"}"`,
    "-c",
    "features.shell_tool=false",
    ...(model ? ["--model", model] : []),
    "-",
  ];
}

export class CodexSubscriptionProvider implements LlmProvider {
  readonly name = "codex";
  readonly stub = false;
  constructor(private readonly options: RuntimeOptions) {}

  async generate(input: GenerateInput): Promise<GenerateResult> {
    const bin = await resolveCli("codex");
    if (!bin) throw new Error("Install Codex, then sign in from AI subscriptions.");
    const start = Date.now();
    const raw = await new Promise<string>((resolve, reject) => {
      const child = spawn(bin, codexArgs(input, this.options.model), {
        env: subscriptionEnv(),
        cwd: this.options.cwd,
        stdio: ["pipe", "pipe", "pipe"],
      });
      this.options.onSpawn?.(child);
      let output = "";
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this.options.signal?.removeEventListener("abort", abort);
        if (error) {
          child.kill("SIGTERM");
          reject(error);
        } else resolve(output);
      };
      const abort = () => finish(new Error("AI request stopped."));
      const timer = setTimeout(
        () => finish(new Error("Codex request timed out.")),
        input.timeoutMs ?? 180_000
      );
      this.options.signal?.addEventListener("abort", abort, { once: true });
      if (this.options.signal?.aborted) abort();
      child.stdout.on("data", (data: Buffer) => {
        output += data.toString();
        if (output.length > 8_000_000) finish(new Error("Codex response exceeded the size limit."));
      });
      // Drain stderr, but never forward provider diagnostics containing account data.
      child.stderr.resume();
      child.on("error", () => finish(new Error("Could not start Codex. Check its installation.")));
      child.on("close", (code) =>
        finish(
          code === 0
            ? undefined
            : new Error(
                "Codex stopped before completing the request. Check your subscription in AI subscriptions."
              )
        )
      );
      child.stdin.on("error", () => finish(new Error("Codex closed the request.")));
      child.stdin.end(
        `${input.system}\n${input.format === "json" ? "Return only valid JSON.\n" : ""}\n${input.prompt}`
      );
    });
    const parsed = parseCodexOutput(raw, this.options.model);
    parsed.usage.ms = Date.now() - start;
    this.options.onUsage?.("codex", parsed.usage);
    return result(this.name, parsed.text);
  }
}

export function parseXaiResponse(body: unknown, model: string): { text: string; usage: CliUsage } {
  const data = body as {
    status?: string;
    error?: unknown;
    output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      input_tokens_details?: { cached_tokens?: number };
    };
  };
  if (data.error || (data.status && data.status !== "completed"))
    throw new Error("xAI did not complete the request.");
  const text = (data.output ?? [])
    .flatMap((item) => item.content ?? [])
    .filter((part) => part.type === "output_text")
    .map((part) => part.text ?? "")
    .join("\n")
    .trim();
  if (!text) throw new Error("xAI returned no answer.");
  const cached = data.usage?.input_tokens_details?.cached_tokens ?? 0;
  return {
    text,
    usage: {
      model,
      input: Math.max(0, (data.usage?.input_tokens ?? 0) - cached),
      output: data.usage?.output_tokens ?? 0,
      cacheRead: cached,
      cacheWrite: 0,
      webSearches: (data.output ?? []).filter((item) => item.type === "web_search_call").length,
      costUsd: 0,
      ms: 0,
    },
  };
}

export class XaiSubscriptionProvider implements LlmProvider {
  readonly name = "xai";
  readonly stub = false;
  constructor(
    private readonly options: RuntimeOptions,
    private readonly request: typeof fetch = fetch
  ) {}

  async generate(input: GenerateInput): Promise<GenerateResult> {
    const start = Date.now();
    const token = await this.options.xaiToken();
    const signal = AbortSignal.any([
      AbortSignal.timeout(input.timeoutMs ?? 180_000),
      ...(this.options.signal ? [this.options.signal] : []),
    ]);
    const response = await this.request("https://api.x.ai/v1/responses", {
      method: "POST",
      redirect: "error",
      signal,
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: this.options.model || "grok-4.7",
        store: false,
        instructions: `${input.system}${input.format === "json" ? "\nReturn only valid JSON." : ""}`,
        input: [{ role: "user", content: input.prompt }],
        ...(input.grounding ? { tools: [{ type: "web_search" }] } : {}),
      }),
    });
    if (!response.ok) {
      if (response.status === 401)
        throw new Error("xAI sign-in expired. Sign in again from AI subscriptions.");
      if (response.status === 403)
        throw new Error("Your xAI subscription does not grant access to this model or tool.");
      if (response.status === 429)
        throw new Error("Your xAI subscription limit was reached. Try again after it resets.");
      throw new Error(`xAI request failed (${response.status}). Try again.`);
    }
    const parsed = parseXaiResponse(await response.json(), this.options.model);
    parsed.usage.ms = Date.now() - start;
    this.options.onUsage?.("xai", parsed.usage);
    return result(this.name, parsed.text);
  }
}

export async function subscriptionProvider(options: RuntimeOptions): Promise<LlmProvider> {
  if (options.provider === "codex") return new CodexSubscriptionProvider(options);
  if (options.provider === "xai") return new XaiSubscriptionProvider(options);
  const bin = await resolveCli("claude");
  if (!bin) throw new Error("Install Claude Code, then sign in from AI subscriptions.");
  return new ClaudeCliLlmProvider({
    bin,
    model: options.model || "sonnet",
    env: subscriptionEnv(),
    cwd: options.cwd,
    onSpawn: (child) => {
      options.onSpawn?.(child);
      const abort = () => child.kill("SIGTERM");
      if (options.signal?.aborted) abort();
      options.signal?.addEventListener("abort", abort, { once: true });
      child.on("close", () => options.signal?.removeEventListener("abort", abort));
    },
    onUsage: (usage) => options.onUsage?.("claude", usage),
  });
}
