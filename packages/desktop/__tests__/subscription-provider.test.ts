import type { LlmProvider } from "@icpfinder/providers";
import { describe, expect, it, vi } from "vitest";
import { runBrowserLoop } from "../src/main/browser-loop";
import {
  codexArgs,
  parseCodexOutput,
  parseXaiResponse,
  XaiSubscriptionProvider,
} from "../src/main/subscription-provider";

describe("subscription execution", () => {
  it("takes the completed Codex answer and separates cached tokens", () => {
    const parsed = parseCodexOutput(
      [
        JSON.stringify({ type: "item.completed", item: { type: "agent_message", text: "answer" } }),
        JSON.stringify({
          type: "turn.completed",
          usage: { input_tokens: 20, cached_input_tokens: 5, output_tokens: 3 },
        }),
      ].join("\n"),
      ""
    );
    expect(parsed.text).toBe("answer");
    expect(parsed.usage).toMatchObject({ input: 15, cacheRead: 5, output: 3 });
  });
  it("rejects failed or truncated Codex turns even if an answer was emitted", () => {
    const answer = JSON.stringify({
      type: "item.completed",
      item: { type: "agent_message", text: "partial" },
    });
    expect(() => parseCodexOutput(answer, "")).toThrow("no completed");
    expect(() => parseCodexOutput(`${answer}\n{"type":"turn.failed"}`, "")).toThrow(
      "could not complete"
    );
  });
  it("isolates Codex config and disables shell execution; web search is intentional", () => {
    const args = codexArgs({ system: "", prompt: "", grounding: true }, "");
    expect(args).toContain("--ignore-user-config");
    expect(args).toContain('model_provider="openai"');
    expect(args).toContain("read-only");
    expect(args).toContain("features.shell_tool=false");
    expect(args).toContain('web_search="live"');
    expect(codexArgs({ system: "", prompt: "" }, "")).toContain('web_search="disabled"');
    expect(args).not.toContain("--model");
  });
  it("uses OAuth for xAI and passes web-search tools without an API key", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "completed",
          output: [
            { type: "message", content: [{ type: "output_text", text: "grounded answer" }] },
          ],
          usage: { input_tokens: 10, output_tokens: 4 },
        })
      )
    );
    const onUsage = vi.fn();
    const provider = new XaiSubscriptionProvider(
      {
        provider: "xai",
        model: "grok-4.7",
        cwd: "/tmp",
        xaiToken: async () => "fixture-oauth-token",
        onUsage,
      },
      request
    );
    expect((await provider.generate({ system: "s", prompt: "p", grounding: true })).text).toBe(
      "grounded answer"
    );
    const [url, init] = request.mock.calls[0] ?? [];
    expect(url).toBe("https://api.x.ai/v1/responses");
    expect(init?.headers).toMatchObject({ authorization: "Bearer fixture-oauth-token" });
    expect(JSON.parse(String(init?.body))).toMatchObject({
      store: false,
      tools: [{ type: "web_search" }],
    });
    expect(onUsage).toHaveBeenCalledWith("xai", expect.objectContaining({ output: 4 }));
  });
  it("reports subscription restrictions without leaking raw server responses", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("sensitive diagnostic", { status: 403 }));
    const provider = new XaiSubscriptionProvider(
      {
        provider: "xai",
        model: "",
        cwd: "/tmp",
        xaiToken: async () => "fixture",
      },
      request
    );
    await expect(provider.generate({ system: "", prompt: "" })).rejects.toThrow(
      "does not grant access"
    );
    expect(() => parseXaiResponse({ status: "incomplete", output: [] }, "")).toThrow(
      "did not complete"
    );
  });
});

describe("provider-neutral browser loop", () => {
  const llm = (answers: string[]): LlmProvider => ({
    name: "fixture",
    stub: true,
    generate: vi.fn(async () => ({
      text: answers.shift() ?? '{"done":"Done"}',
      stub: true,
      cost: { provider: "fixture", endpoint: "", units: 0, costCents: 0 },
    })),
  });
  it("executes approved tool calls and retains the original task", async () => {
    const provider = llm([
      '{"tool":"ask_founder","args":{"action":"Send message","preview":"Hi"}}',
      '{"done":"Stopped after asking"}',
    ]);
    const tool = vi.fn(async () => ({ content: [{ type: "text", text: "declined" }] }));
    const say = vi.fn();
    await runBrowserLoop({
      llm: provider,
      task: "Original task",
      system: "",
      signal: new AbortController().signal,
      tool,
      say,
    });
    expect(tool).toHaveBeenCalledWith("ask_founder", { action: "Send message", preview: "Hi" });
    expect(provider.generate).toHaveBeenLastCalledWith(
      expect.objectContaining({ prompt: expect.stringContaining("Original task") })
    );
    expect(say).toHaveBeenCalledWith("Stopped after asking");
  });
  it("does not execute an action after cancellation while generating", async () => {
    const controller = new AbortController();
    const provider = llm([]);
    provider.generate = async () => {
      controller.abort();
      return {
        text: '{"tool":"browser_click","args":{"id":1}}',
        stub: true,
        cost: { provider: "", endpoint: "", units: 0, costCents: 0 },
      };
    };
    const tool = vi.fn();
    await expect(
      runBrowserLoop({
        llm: provider,
        task: "",
        system: "",
        signal: controller.signal,
        tool,
        say: vi.fn(),
      })
    ).rejects.toThrow();
    expect(tool).not.toHaveBeenCalled();
  });
  it("rejects arbitrary tool names", async () => {
    const tool = vi.fn();
    await expect(
      runBrowserLoop({
        llm: llm(['{"tool":"shell","args":{}}']),
        task: "",
        system: "",
        signal: new AbortController().signal,
        tool,
        say: vi.fn(),
      })
    ).rejects.toThrow("unsupported action");
    expect(tool).not.toHaveBeenCalled();
  });
});
