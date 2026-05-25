// SPDX-License-Identifier: MIT

import type { GenerateInput, GenerateResult, LlmProvider } from "@icpfinder/providers";
import { describe, expect, it, vi } from "vitest";
import { generateArchetypes, parseArchetypes } from "../src/archetypes";

const makeLlm = (text: string, costCents = 0.1, stub = false): LlmProvider => ({
  name: "mock",
  stub,
  generate: vi.fn().mockResolvedValue({
    text,
    cost: { units: 100, costCents, provider: "mock", endpoint: "generate" },
    stub,
  } satisfies GenerateResult),
});

describe("parseArchetypes", () => {
  it("parses a clean JSON array", () => {
    const raw = JSON.stringify([
      {
        industry: "B2B SaaS",
        role: "Head of Marketing",
        companySize: "10-50",
        pain: "Cold email reply rates dropping",
        buyingSignals: ["hiring SDRs", "recently funded"],
      },
    ]);
    const archetypes = parseArchetypes(raw);
    expect(archetypes).toHaveLength(1);
    expect(archetypes[0]?.id).toBe("arch_0");
    expect(archetypes[0]?.industry).toBe("B2B SaaS");
    expect(archetypes[0]?.buyingSignals).toEqual(["hiring SDRs", "recently funded"]);
  });

  it("strips markdown code fences", () => {
    const raw =
      '```json\n[{"industry":"X","role":"Y","companySize":"Z","pain":"p","buyingSignals":[]}]\n```';
    const archetypes = parseArchetypes(raw);
    expect(archetypes).toHaveLength(1);
    expect(archetypes[0]?.industry).toBe("X");
  });

  it("extracts a JSON array embedded in prose", () => {
    const raw =
      'Here are the archetypes: [{"industry":"X","role":"Y","companySize":"Z","pain":"p","buyingSignals":["a"]}] Done.';
    const archetypes = parseArchetypes(raw);
    expect(archetypes).toHaveLength(1);
  });

  it("returns empty array for invalid JSON", () => {
    expect(parseArchetypes("not json at all")).toEqual([]);
  });

  it("returns empty array when top-level is not an array", () => {
    expect(parseArchetypes('{"industry":"X"}')).toEqual([]);
  });

  it("coerces missing fields to placeholders", () => {
    const raw = JSON.stringify([{ role: "CEO" }]);
    const archetypes = parseArchetypes(raw);
    expect(archetypes[0]?.industry).toBe("Unknown industry");
    expect(archetypes[0]?.role).toBe("CEO");
    expect(archetypes[0]?.buyingSignals).toEqual([]);
  });

  it("filters non-string buying signals", () => {
    const raw = JSON.stringify([
      {
        industry: "X",
        role: "Y",
        companySize: "Z",
        pain: "p",
        buyingSignals: ["valid", null, 42, "  ", "another"],
      },
    ]);
    const archetypes = parseArchetypes(raw);
    expect(archetypes[0]?.buyingSignals).toEqual(["valid", "another"]);
  });

  it("assigns stable arch_<index> ids", () => {
    const raw = JSON.stringify([
      { industry: "A", role: "x", companySize: "x", pain: "x", buyingSignals: [] },
      { industry: "B", role: "x", companySize: "x", pain: "x", buyingSignals: [] },
    ]);
    const archetypes = parseArchetypes(raw);
    expect(archetypes.map((a) => a.id)).toEqual(["arch_0", "arch_1"]);
  });

  it("parses exampleCompanies and normalizes domains", () => {
    const raw = JSON.stringify([
      {
        industry: "X",
        role: "Y",
        companySize: "Z",
        pain: "p",
        buyingSignals: [],
        exampleCompanies: [
          { name: "Stripe", domain: "https://www.stripe.com/payments" },
          { name: "Linear", domain: "  LINEAR.APP  " },
          { name: "Notion", domain: "notion.so" },
        ],
      },
    ]);
    const [arch] = parseArchetypes(raw);
    expect(arch?.exampleCompanies).toEqual([
      { name: "Stripe", domain: "stripe.com" },
      { name: "Linear", domain: "linear.app" },
      { name: "Notion", domain: "notion.so" },
    ]);
  });

  it("strips banned placeholder domains (example.com, acme.com, etc.)", () => {
    const raw = JSON.stringify([
      {
        industry: "X",
        role: "Y",
        companySize: "Z",
        pain: "p",
        buyingSignals: [],
        exampleCompanies: [
          { name: "Real", domain: "stripe.com" },
          { name: "Placeholder", domain: "example.com" },
          { name: "Acme", domain: "acme.com" },
          { name: "Test", domain: "foo.test" },
          { name: "Your", domain: "yourcompany.com" },
        ],
      },
    ]);
    const [arch] = parseArchetypes(raw);
    expect(arch?.exampleCompanies).toEqual([{ name: "Real", domain: "stripe.com" }]);
  });

  it("dedupes example companies by normalized domain", () => {
    const raw = JSON.stringify([
      {
        industry: "X",
        role: "Y",
        companySize: "Z",
        pain: "p",
        buyingSignals: [],
        exampleCompanies: [
          { name: "Stripe", domain: "stripe.com" },
          { name: "Stripe Inc", domain: "https://stripe.com" },
        ],
      },
    ]);
    const [arch] = parseArchetypes(raw);
    expect(arch?.exampleCompanies).toHaveLength(1);
  });

  it("returns empty exampleCompanies when field missing", () => {
    const raw = JSON.stringify([
      { industry: "X", role: "Y", companySize: "Z", pain: "p", buyingSignals: [] },
    ]);
    const [arch] = parseArchetypes(raw);
    expect(arch?.exampleCompanies).toEqual([]);
  });

  it("skips entries with missing or invalid domain", () => {
    const raw = JSON.stringify([
      {
        industry: "X",
        role: "Y",
        companySize: "Z",
        pain: "p",
        buyingSignals: [],
        exampleCompanies: [
          { name: "NoDomain" },
          { domain: 12345 },
          { name: "Bare", domain: "notavaliddomain" },
          { name: "Good", domain: "good.io" },
        ],
      },
    ]);
    const [arch] = parseArchetypes(raw);
    expect(arch?.exampleCompanies).toEqual([{ name: "Good", domain: "good.io" }]);
  });
});

describe("generateArchetypes", () => {
  it("calls llm.generate with json format + grounding flag", async () => {
    const llm = makeLlm(
      JSON.stringify([{ industry: "X", role: "Y", companySize: "Z", pain: "p", buyingSignals: [] }])
    );
    await generateArchetypes({ llm, seed: "AI invoicing", limit: 3, grounding: true });

    const call = (llm.generate as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as GenerateInput;
    expect(call.format).toBe("json");
    expect(call.grounding).toBe(true);
    expect(call.prompt).toContain("AI invoicing");
    expect(call.prompt).toContain("3 distinct ICP archetypes");
  });

  it("respects limit by truncating the parsed array", async () => {
    const raw = JSON.stringify(
      Array.from({ length: 5 }, () => ({
        industry: "X",
        role: "Y",
        companySize: "Z",
        pain: "p",
        buyingSignals: [],
      }))
    );
    const llm = makeLlm(raw);
    const result = await generateArchetypes({ llm, seed: "x", limit: 2, grounding: false });
    expect(result.archetypes).toHaveLength(2);
  });

  it("returns the provider cost untouched", async () => {
    const llm = makeLlm("[]", 0.42);
    const result = await generateArchetypes({ llm, seed: "x", limit: 1, grounding: false });
    expect(result.costCents).toBe(0.42);
  });

  it("propagates stub flag", async () => {
    const llm = makeLlm("[]", 0, true);
    const result = await generateArchetypes({ llm, seed: "x", limit: 1, grounding: false });
    expect(result.stub).toBe(true);
  });
});
