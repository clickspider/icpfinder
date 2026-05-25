// SPDX-License-Identifier: MIT

import type { FindEvent } from "@icpfinder/core";
import { describe, expect, it } from "vitest";
import { encodeEvent, encodeHeartbeat, sseStreamFromEvents } from "../lib/sse";

const decoder = new TextDecoder();

const collectStream = async (stream: ReadableStream<Uint8Array>): Promise<string> => {
  const reader = stream.getReader();
  let out = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) out += decoder.decode(value);
  }
  return out;
};

describe("encodeEvent", () => {
  it("emits an SSE frame with event + data lines", () => {
    const event: FindEvent = {
      type: "archetype",
      archetype: {
        id: "arch_0",
        industry: "X",
        role: "Y",
        companySize: "Z",
        pain: "p",
        buyingSignals: [],
        exampleCompanies: [],
      },
    };
    const frame = decoder.decode(encodeEvent(event));
    expect(frame).toContain("event: archetype\n");
    expect(frame).toContain('"id":"arch_0"');
    expect(frame.endsWith("\n\n")).toBe(true);
  });

  it("emits heartbeat as a comment frame", () => {
    const frame = decoder.decode(encodeHeartbeat());
    expect(frame.startsWith(":")).toBe(true);
    expect(frame.endsWith("\n\n")).toBe(true);
  });
});

describe("sseStreamFromEvents", () => {
  it("streams every event in order then closes", async () => {
    const events: FindEvent[] = [
      {
        type: "archetype",
        archetype: {
          id: "a",
          industry: "i",
          role: "r",
          companySize: "s",
          pain: "p",
          buyingSignals: [],
          exampleCompanies: [],
        },
      },
      { type: "cost", cost: { units: 1, costCents: 0.1, provider: "p", endpoint: "e" } },
      { type: "done", totalCostCents: 0.1 },
    ];
    async function* gen() {
      for (const ev of events) yield ev;
    }
    const stream = sseStreamFromEvents(gen(), { heartbeatMs: 60_000 });
    const out = await collectStream(stream);
    expect(out).toContain("event: archetype");
    expect(out).toContain("event: cost");
    expect(out).toContain("event: done");
    const archetypeIdx = out.indexOf("event: archetype");
    const doneIdx = out.indexOf("event: done");
    expect(archetypeIdx).toBeLessThan(doneIdx);
  });

  it("emits a final error event when the generator throws", async () => {
    async function* gen(): AsyncGenerator<FindEvent, void, void> {
      yield { type: "cost", cost: { units: 0, costCents: 0, provider: "p", endpoint: "e" } };
      throw new Error("boom");
    }
    const stream = sseStreamFromEvents(gen(), { heartbeatMs: 60_000 });
    const out = await collectStream(stream);
    expect(out).toContain("event: error");
    expect(out).toContain("boom");
  });
});
