// SPDX-License-Identifier: MIT

import { chmodSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ClaudeCliLlmProvider } from "../src/claude-cli";
import { ProviderAuthError, ProviderNetworkError } from "../src/types";

// Fake `claude` binary: echoes its args + stdin so we can assert the call.
const fakeBin = (script: string): string => {
  const dir = mkdtempSync(join(tmpdir(), "fake-claude-"));
  const bin = join(dir, "claude");
  writeFileSync(bin, `#!/bin/sh\n${script}\n`);
  chmodSync(bin, 0o755);
  return bin;
};

describe("ClaudeCliLlmProvider", () => {
  it("passes prompt on stdin and pins tools (none without grounding)", async () => {
    const bin = fakeBin('echo "ARGS:$*"; echo "STDIN:$(cat)"');
    const r = await new ClaudeCliLlmProvider({ bin }).generate({ system: "S", prompt: "hello" });
    expect(r.text).toContain("STDIN:hello");
    expect(r.text).toContain("--tools  --strict-mcp-config");
    expect(r.cost.costCents).toBe(0);
    expect(r.stub).toBe(false);
  });

  it("grounding enables WebSearch + WebFetch", async () => {
    const bin = fakeBin('echo "ARGS:$*"; cat >/dev/null');
    const r = await new ClaudeCliLlmProvider({ bin, model: "haiku" }).generate({
      system: "",
      prompt: "x",
      grounding: true,
    });
    expect(r.text).toContain("--tools WebSearch,WebFetch");
    expect(r.text).toContain("--model haiku");
  });

  it("maps a login failure to ProviderAuthError", async () => {
    const bin = fakeBin('cat >/dev/null; echo "Not logged in. Please run /login" >&2; exit 1');
    await expect(
      new ClaudeCliLlmProvider({ bin }).generate({ system: "", prompt: "x" })
    ).rejects.toBeInstanceOf(ProviderAuthError);
  });

  it("times out", async () => {
    const bin = fakeBin("sleep 5");
    await expect(
      new ClaudeCliLlmProvider({ bin, timeoutMs: 100 }).generate({ system: "", prompt: "x" })
    ).rejects.toBeInstanceOf(ProviderNetworkError);
  });
});

describe("usage from the JSON result", () => {
  it("returns the text and reports tokens and cost", async () => {
    const json = JSON.stringify({
      type: "result",
      result: "hello",
      total_cost_usd: 0.01,
      duration_ms: 900,
      usage: {
        input_tokens: 5,
        output_tokens: 7,
        cache_read_input_tokens: 100,
        cache_creation_input_tokens: 20,
      },
      modelUsage: { "claude-haiku-5-5": {} },
    });
    const bin = fakeBin(`cat >/dev/null; echo '${json}'`);
    const seen: unknown[] = [];
    const r = await new ClaudeCliLlmProvider({ bin, onUsage: (u) => seen.push(u) }).generate({
      system: "",
      prompt: "x",
    });
    expect(r.text).toBe("hello");
    expect(seen[0]).toMatchObject({
      model: "claude-haiku-5-5",
      input: 5,
      output: 7,
      cacheRead: 100,
      cacheWrite: 20,
      costUsd: 0.01,
    });
  });
});
