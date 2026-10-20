// SPDX-License-Identifier: MIT
//
// ClaudeCliLlmProvider — runs the local Claude Code CLI (`claude -p`) so AI
// calls use the machine's Claude subscription login instead of an API key.
// Self-host / local dev only: needs `claude` installed and logged in.
// Grounding maps to the CLI's WebSearch + WebFetch tools; otherwise no tools at all.

import { type ChildProcess, spawn } from "node:child_process";
import {
  type CostUnit,
  type GenerateInput,
  type GenerateResult,
  type LlmProvider,
  ProviderAuthError,
  ProviderNetworkError,
} from "./types";

const DEFAULT_TIMEOUT_MS = 120_000;

export interface ClaudeCliOptions {
  /** Path to the claude binary. Defaults to `claude` on PATH. */
  bin?: string;
  /** Optional --model value (e.g. "sonnet", "haiku"). CLI default when unset. */
  model?: string;
  timeoutMs?: number;
  /** Called with every spawned claude process, so a host can stop it early. */
  onSpawn?: (child: ChildProcess) => void;
  /** Called after each run with what it used (tokens, cache, cost), for a usage meter. */
  onUsage?: (u: CliUsage) => void;
}

/** What one Claude Code run used, read from its JSON result. */
export interface CliUsage {
  model: string;
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  webSearches: number;
  /** List-price equivalent in USD. On a subscription nothing is charged per call. */
  costUsd: number;
  ms: number;
}

/** Parse Claude Code's `--output-format json` result; plain text passes through. */
export const parseCliResult = (raw: string): { text: string; usage?: CliUsage } => {
  try {
    const d = JSON.parse(raw) as {
      result?: string;
      total_cost_usd?: number;
      duration_ms?: number;
      usage?: {
        input_tokens?: number;
        output_tokens?: number;
        cache_read_input_tokens?: number;
        cache_creation_input_tokens?: number;
        server_tool_use?: { web_search_requests?: number };
      };
      modelUsage?: Record<string, unknown>;
    };
    if (typeof d.result !== "string") return { text: raw };
    const u = d.usage ?? {};
    return {
      text: d.result,
      usage: {
        model: Object.keys(d.modelUsage ?? {})[0] ?? "",
        input: u.input_tokens ?? 0,
        output: u.output_tokens ?? 0,
        cacheRead: u.cache_read_input_tokens ?? 0,
        cacheWrite: u.cache_creation_input_tokens ?? 0,
        webSearches: u.server_tool_use?.web_search_requests ?? 0,
        costUsd: d.total_cost_usd ?? 0,
        ms: d.duration_ms ?? 0,
      },
    };
  } catch {
    return { text: raw };
  }
};

const zeroCost = (): CostUnit => ({
  units: 0,
  costCents: 0,
  provider: "claude-cli",
  endpoint: "generate",
});

export class ClaudeCliLlmProvider implements LlmProvider {
  readonly name = "claude-cli";
  readonly stub = false;

  private readonly bin: string;
  private readonly model: string | undefined;
  private readonly timeoutMs: number;
  private readonly onSpawn: ((child: ChildProcess) => void) | undefined;
  private readonly onUsage: ((u: CliUsage) => void) | undefined;

  constructor(opts: ClaudeCliOptions = {}) {
    this.bin = opts.bin || "claude";
    this.model = opts.model || undefined;
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.onSpawn = opts.onSpawn;
    this.onUsage = opts.onUsage;
  }

  async generate(input: GenerateInput): Promise<GenerateResult> {
    // Same flags as lore-app: stateless, no user settings/MCP, tools pinned.
    const args = [
      "-p",
      "--output-format",
      "json",
      "--tools",
      input.grounding ? "WebSearch,WebFetch" : "",
      "--strict-mcp-config",
      "--setting-sources",
      "",
      "--no-session-persistence",
    ];
    if (input.grounding) args.push("--allowedTools", "WebSearch,WebFetch");
    if (this.model) args.push("--model", this.model);
    const system =
      input.format === "json"
        ? `${input.system}\n\nReply with the JSON only. No prose.`
        : input.system;
    if (system) args.push("--append-system-prompt", system);

    const timeout = input.timeoutMs ?? this.timeoutMs;
    let text: string;
    try {
      text = await this.run(args, input.prompt, timeout);
    } catch (e) {
      // A login problem or a stopped run will not fix itself; anything else gets one more try.
      if (e instanceof ProviderAuthError || /SIGTERM|killed|null/.test(String(e))) throw e;
      await new Promise((r) => setTimeout(r, 2_000));
      text = await this.run(args, input.prompt, timeout);
    }
    return { text, cost: zeroCost(), stub: false };
  }

  private run(args: string[], stdin: string, timeoutMs: number): Promise<string> {
    return new Promise((resolve, reject) => {
      // Strip API keys so the CLI always uses the subscription login.
      const { ANTHROPIC_API_KEY: _a, ANTHROPIC_AUTH_TOKEN: _b, ...env } = process.env;
      const child = spawn(this.bin, args, { env, stdio: ["pipe", "pipe", "pipe"] });
      this.onSpawn?.(child);
      let out = "";
      let err = "";
      const timer = setTimeout(() => {
        child.kill("SIGTERM");
        reject(new ProviderNetworkError(`claude -p timed out after ${timeoutMs}ms`, "gemini"));
      }, timeoutMs);
      child.stdout.on("data", (d) => {
        out += d;
      });
      child.stderr.on("data", (d) => {
        err += d;
      });
      child.on("error", (e) => {
        clearTimeout(timer);
        reject(new ProviderNetworkError(`Could not start claude CLI: ${e.message}`, "gemini"));
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        const parsed = parseCliResult(out.trim());
        const text = parsed.text.trim();
        if (parsed.usage) this.onUsage?.(parsed.usage);
        if (code === 0 && text) return resolve(text);
        const msg = `${text} ${err}`.toLowerCase();
        if (/log ?in|not authenticated|unauthorized|api key/.test(msg)) {
          return reject(
            new ProviderAuthError(
              "claude CLI is not logged in (run `claude` then /login)",
              "gemini"
            )
          );
        }
        reject(new Error(`claude -p exited ${code}: ${(err || text).slice(0, 200)}`));
      });
      child.stdin.end(stdin);
    });
  }
}
