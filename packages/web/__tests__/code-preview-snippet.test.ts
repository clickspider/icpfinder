// SPDX-License-Identifier: MIT
//
// IRON GATE: the landing page hero shows a TypeScript example
// (components/marketing/CodePreview.tsx) that imports IcpFinder and the
// provider classes. If the public API drifts, this test fails BEFORE the
// landing page ships fictional code. Do not weaken the assertions.

import { describe, expect, it } from "vitest";
import { IcpFinder } from "@icpfinder/core";
import {
  FakeEmailProvider,
  FakeLlmProvider,
  GeminiLlmProvider,
  HunterEmailProvider,
} from "@icpfinder/providers";

describe("CodePreview snippet — API drift guard", () => {
  it("IcpFinder is constructable with stub providers and find() is an async generator", async () => {
    const finder = new IcpFinder({
      llm: new FakeLlmProvider(),
      email: new FakeEmailProvider(),
    });
    expect(typeof finder.find).toBe("function");

    const iterator = finder.find({ seed: "AI invoicing for indie SaaS" });
    expect(typeof iterator[Symbol.asyncIterator]).toBe("function");

    const events: string[] = [];
    for await (const event of iterator) {
      events.push(event.type);
      if (events.length >= 12) break;
    }
    expect(events.length).toBeGreaterThan(0);
  });

  it("GeminiLlmProvider accepts an apiKey option (the snippet's shape)", () => {
    const llm = new GeminiLlmProvider({ apiKey: "test-key" });
    expect(llm).toBeInstanceOf(GeminiLlmProvider);
    expect(typeof llm.generate).toBe("function");
  });

  it("HunterEmailProvider accepts an apiKey option (the snippet's shape)", () => {
    const email = new HunterEmailProvider({ apiKey: "test-key" });
    expect(email).toBeInstanceOf(HunterEmailProvider);
    expect(typeof email.searchDomain).toBe("function");
  });
});
