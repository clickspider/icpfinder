// SPDX-License-Identifier: MIT

import { describe, expect, it, vi } from "vitest";
import { GeminiLlmProvider } from "../src/gemini";
import { ProviderAuthError, ProviderRateLimitError } from "../src/types";

const okResponse = (body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

const errorResponse = (status: number, body: unknown = {}): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const archetypeResponse = (text: string, outputTokens = 450): Response =>
  okResponse({
    candidates: [
      {
        content: { parts: [{ text }] },
        finishReason: "STOP",
      },
    ],
    usageMetadata: {
      promptTokenCount: 200,
      candidatesTokenCount: outputTokens,
      totalTokenCount: 200 + outputTokens,
    },
  });

describe("GeminiLlmProvider — stub mode (no apiKey)", () => {
  it("returns stub JSON archetype when format=json", async () => {
    const provider = new GeminiLlmProvider();
    const result = await provider.generate({
      system: "You are an ICP analyst.",
      prompt: "find ICPs for AI invoicing tool",
      format: "json",
    });
    expect(provider.stub).toBe(true);
    expect(result.stub).toBe(true);
    expect(() => JSON.parse(result.text)).not.toThrow();
    expect(result.cost.units).toBe(0);
    expect(result.cost.costCents).toBe(0);
  });

  it("returns plain stub text when format=text", async () => {
    const provider = new GeminiLlmProvider();
    const result = await provider.generate({
      system: "x",
      prompt: "x",
      format: "text",
    });
    expect(result.text).toContain("STUB");
  });

  it("invokes onCost in stub mode with grounding flag", async () => {
    const onCost = vi.fn();
    const provider = new GeminiLlmProvider({ onCost });
    await provider.generate({
      system: "x",
      prompt: "x",
      grounding: true,
    });
    expect(onCost).toHaveBeenCalledOnce();
    expect(onCost.mock.calls[0]?.[0].grounding).toBe(true);
    expect(onCost.mock.calls[0]?.[0].cost.units).toBe(0);
  });
});

describe("GeminiLlmProvider — live mode (mocked fetch)", () => {
  it("posts prompt + system to generateContent endpoint", async () => {
    let capturedBody: string | null = null;
    let capturedHeaders: Record<string, string> = {};
    let capturedUrl = "";
    const fetchImpl = vi.fn().mockImplementation((url: string, init: RequestInit) => {
      capturedUrl = url;
      capturedBody = init.body as string;
      capturedHeaders = init.headers as Record<string, string>;
      return Promise.resolve(archetypeResponse('[{"industry":"x"}]'));
    });
    const provider = new GeminiLlmProvider({ apiKey: "test_key", fetchImpl });

    const result = await provider.generate({
      system: "system text",
      prompt: "user prompt",
      format: "json",
    });

    expect(capturedUrl).toContain("/v1beta/models/gemini-2.5-flash:generateContent");
    expect(capturedHeaders["x-goog-api-key"]).toBe("test_key");
    expect(capturedBody).not.toBeNull();
    const parsedBody = JSON.parse(capturedBody as unknown as string);
    expect(parsedBody.contents[0].parts[0].text).toBe("user prompt");
    expect(parsedBody.systemInstruction.parts[0].text).toBe("system text");
    expect(parsedBody.generationConfig.responseMimeType).toBe("application/json");
    expect(parsedBody.tools).toBeUndefined();
    expect(result.text).toBe('[{"industry":"x"}]');
    expect(result.stub).toBe(false);
  });

  it("enables googleSearch tool when grounding=true", async () => {
    let capturedBody: string | null = null;
    const fetchImpl = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      capturedBody = init.body as string;
      return Promise.resolve(archetypeResponse("ok"));
    });
    const provider = new GeminiLlmProvider({ apiKey: "k", fetchImpl });

    await provider.generate({
      system: "x",
      prompt: "x",
      grounding: true,
      format: "json",
    });

    const parsed = JSON.parse(capturedBody as unknown as string);
    expect(parsed.tools).toEqual([{ googleSearch: {} }]);
    // Grounding + JSON mime are mutually exclusive — grounding wins.
    expect(parsed.generationConfig).toBeUndefined();
  });

  it("computes cost based on candidate token count", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(archetypeResponse("response", 2000));
    const provider = new GeminiLlmProvider({ apiKey: "k", fetchImpl });

    const result = await provider.generate({
      system: "x",
      prompt: "x",
    });

    expect(result.cost.units).toBe(2000);
    // 2000 / 1000 * 0.06 = 0.12 cents
    expect(result.cost.costCents).toBeCloseTo(0.12, 2);
  });

  it("supports custom cost rate", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(archetypeResponse("response", 1000));
    const provider = new GeminiLlmProvider({
      apiKey: "k",
      costCentsPer1kOutTokens: 0.3,
      fetchImpl,
    });

    const result = await provider.generate({
      system: "x",
      prompt: "x",
    });

    expect(result.cost.costCents).toBeCloseTo(0.3, 2);
  });

  it("throws ProviderAuthError on 401", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(errorResponse(401));
    const provider = new GeminiLlmProvider({ apiKey: "bad", fetchImpl });

    await expect(provider.generate({ system: "x", prompt: "x" })).rejects.toThrow(
      ProviderAuthError
    );
  });

  it("throws ProviderAuthError on 403", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(errorResponse(403));
    const provider = new GeminiLlmProvider({ apiKey: "bad", fetchImpl });

    await expect(provider.generate({ system: "x", prompt: "x" })).rejects.toThrow(
      ProviderAuthError
    );
  });

  it("throws ProviderRateLimitError after exhausting 429 retries", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(errorResponse(429));
    const provider = new GeminiLlmProvider({ apiKey: "k", fetchImpl });

    await expect(provider.generate({ system: "x", prompt: "x" })).rejects.toThrow(
      ProviderRateLimitError
    );
  }, 15000);

  it("retries once on 5xx server error", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(errorResponse(503))
      .mockResolvedValueOnce(archetypeResponse("recovered"));
    const provider = new GeminiLlmProvider({ apiKey: "k", fetchImpl });

    const result = await provider.generate({ system: "x", prompt: "x" });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result.text).toBe("recovered");
  });

  it("uses custom model when specified", async () => {
    let capturedUrl = "";
    const fetchImpl = vi.fn().mockImplementation((url: string) => {
      capturedUrl = url;
      return Promise.resolve(archetypeResponse("x"));
    });
    const provider = new GeminiLlmProvider({
      apiKey: "k",
      model: "gemini-2.5-pro",
      fetchImpl,
    });

    await provider.generate({ system: "x", prompt: "x" });

    expect(capturedUrl).toContain("/models/gemini-2.5-pro:generateContent");
  });
});

describe("GeminiLlmProvider — onCost grounding flag", () => {
  it("logs grounding=true when grounding requested", async () => {
    const onCost = vi.fn();
    const fetchImpl = vi.fn().mockResolvedValue(archetypeResponse("x"));
    const provider = new GeminiLlmProvider({ apiKey: "k", onCost, fetchImpl });

    await provider.generate({ system: "x", prompt: "x", grounding: true });

    expect(onCost).toHaveBeenCalledOnce();
    expect(onCost.mock.calls[0]?.[0].grounding).toBe(true);
  });

  it("logs grounding=false when not requested", async () => {
    const onCost = vi.fn();
    const fetchImpl = vi.fn().mockResolvedValue(archetypeResponse("x"));
    const provider = new GeminiLlmProvider({ apiKey: "k", onCost, fetchImpl });

    await provider.generate({ system: "x", prompt: "x" });

    expect(onCost.mock.calls[0]?.[0].grounding).toBe(false);
  });
});
