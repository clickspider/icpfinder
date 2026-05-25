// SPDX-License-Identifier: MIT

import type { EmailProvider, GenerateResult, LlmProvider } from "@icpfinder/providers";
import { FakeEmailProvider, FakeLlmProvider } from "@icpfinder/providers";
import { describe, expect, it, vi } from "vitest";
import { IcpFinder } from "../src/icp-finder";
import type { FindEvent } from "../src/types";

const collect = async (gen: AsyncGenerator<FindEvent, void, void>): Promise<FindEvent[]> => {
  const events: FindEvent[] = [];
  for await (const ev of gen) events.push(ev);
  return events;
};

const archetypeJson = (count: number, companiesPerArchetype = 5): string =>
  JSON.stringify(
    Array.from({ length: count }, (_, i) => ({
      industry: `Industry ${i}`,
      role: `Role ${i}`,
      companySize: "10-50",
      pain: "pain",
      buyingSignals: ["s1"],
      exampleCompanies: Array.from({ length: companiesPerArchetype }, (_unused, j) => ({
        name: `Company ${i}-${j}`,
        domain: `company-${i}-${j}.com`,
      })),
    }))
  );

const mockLlm = (text: string, costCents = 0.1): LlmProvider => ({
  name: "mock-llm",
  stub: false,
  generate: vi.fn().mockResolvedValue({
    text,
    cost: { units: 100, costCents, provider: "mock-llm", endpoint: "generate" },
    stub: false,
  } satisfies GenerateResult),
});

describe("IcpFinder.find — happy path", () => {
  it("streams archetype + candidate + cost + done events", async () => {
    const finder = new IcpFinder({
      llm: mockLlm(archetypeJson(2)),
      email: new FakeEmailProvider(),
    });
    const events = await collect(
      finder.find({ seed: "AI tool for invoicing", candidatesPerArchetype: 2 })
    );

    const archetypes = events.filter((e) => e.type === "archetype");
    const candidates = events.filter((e) => e.type === "candidate");
    const dones = events.filter((e) => e.type === "done");

    expect(archetypes).toHaveLength(2);
    expect(candidates).toHaveLength(4); // 2 archetypes * 2 candidates
    expect(dones).toHaveLength(1);
    expect(events.at(-1)?.type).toBe("done");
  });

  it("emits archetype before any candidate referencing it", async () => {
    const finder = new IcpFinder({
      llm: mockLlm(archetypeJson(2)),
      email: new FakeEmailProvider(),
    });
    const events = await collect(finder.find({ seed: "x", candidatesPerArchetype: 1 }));

    const seenArchetypes = new Set<string>();
    for (const ev of events) {
      if (ev.type === "archetype") seenArchetypes.add(ev.archetype.id);
      if (ev.type === "candidate") {
        expect(seenArchetypes.has(ev.candidate.archetypeId)).toBe(true);
      }
    }
  });

  it("accumulates totalCostCents into the done event", async () => {
    const finder = new IcpFinder({
      llm: mockLlm(archetypeJson(1), 0.5),
      email: new FakeEmailProvider(),
    });
    const events = await collect(finder.find({ seed: "x", candidatesPerArchetype: 2 }));
    const done = events.find((e) => e.type === "done");
    expect(done && done.type === "done" && done.totalCostCents).toBe(0.5);
  });
});

describe("IcpFinder.find — input validation", () => {
  it("yields error + done when seed is empty", async () => {
    const finder = new IcpFinder({
      llm: new FakeLlmProvider(),
      email: new FakeEmailProvider(),
    });
    const events = await collect(finder.find({ seed: "   " }));
    expect(events[0]).toMatchObject({ type: "error", recoverable: false });
    expect(events.at(-1)?.type).toBe("done");
  });
});

describe("IcpFinder.find — error handling", () => {
  it("yields error + done when archetype generation throws", async () => {
    const llm: LlmProvider = {
      name: "mock-llm",
      stub: false,
      generate: vi.fn().mockRejectedValue(new Error("API down")),
    };
    const finder = new IcpFinder({ llm, email: new FakeEmailProvider() });
    const events = await collect(finder.find({ seed: "x" }));
    const err = events.find((e) => e.type === "error");
    expect(err && err.type === "error" && err.message).toContain("API down");
    expect(events.at(-1)?.type).toBe("done");
  });

  it("yields error when LLM returns no parseable archetypes", async () => {
    const finder = new IcpFinder({
      llm: mockLlm("not json at all"),
      email: new FakeEmailProvider(),
    });
    const events = await collect(finder.find({ seed: "x" }));
    const err = events.find((e) => e.type === "error");
    expect(err && err.type === "error" && err.message).toMatch(/no parseable archetypes/i);
  });

  it("recovers when one email lookup fails", async () => {
    const flakyEmail: EmailProvider = {
      name: "flaky",
      stub: false,
      findEmail: vi.fn(),
      verifyEmail: vi.fn(),
      searchDomain: vi.fn().mockRejectedValue(new Error("hunter down")),
    };
    const finder = new IcpFinder({
      llm: mockLlm(archetypeJson(1)),
      email: flakyEmail,
    });
    const events = await collect(finder.find({ seed: "x", candidatesPerArchetype: 2 }));
    const errors = events.filter((e) => e.type === "error");
    const candidates = events.filter((e) => e.type === "candidate");
    expect(errors.length).toBeGreaterThan(0);
    expect(candidates).toHaveLength(2); // candidates still emitted, just with null email
    expect(events.at(-1)?.type).toBe("done");
  });
});

describe("IcpFinder.find — empty exampleCompanies", () => {
  it("emits an error event and skips enrichment when LLM returns no example companies", async () => {
    const archetypeWithoutCompanies = JSON.stringify([
      {
        industry: "I",
        role: "R",
        companySize: "S",
        pain: "p",
        buyingSignals: [],
        exampleCompanies: [],
      },
    ]);
    const finder = new IcpFinder({
      llm: mockLlm(archetypeWithoutCompanies),
      email: new FakeEmailProvider(),
    });
    const events = await collect(finder.find({ seed: "x" }));
    const candidates = events.filter((e) => e.type === "candidate");
    const errors = events.filter((e) => e.type === "error");
    expect(candidates).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0] && errors[0].type === "error" && errors[0].message).toMatch(
      /no real example/i
    );
  });
});

describe("IcpFinder.find — budget cap", () => {
  it("stops streaming when total cost exceeds budgetCapCents", async () => {
    const finder = new IcpFinder({
      llm: mockLlm(archetypeJson(3), 10), // 10 cents on first call
      email: new FakeEmailProvider(),
    });
    const events = await collect(finder.find({ seed: "x", budgetCapCents: 5 }));
    expect(events.filter((e) => e.type === "candidate")).toHaveLength(0);
    expect(events.at(-1)?.type).toBe("done");
  });
});

describe("IcpFinder.find — cancellation", () => {
  it("stops streaming when signal is pre-aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const finder = new IcpFinder({
      llm: new FakeLlmProvider(),
      email: new FakeEmailProvider(),
    });
    const events = await collect(finder.find({ seed: "x", signal: controller.signal }));
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("done");
  });
});
