// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";
import { FakeEmailProvider, FakeLlmProvider } from "../src/fake";

describe("FakeEmailProvider", () => {
  const provider = new FakeEmailProvider();

  it("findEmail returns deterministic synthetic address", async () => {
    const result = await provider.findEmail({
      domain: "example.com",
      firstName: "Sarah",
      lastName: "Chen",
    });
    expect(result.email).toBe("sarah@example.com");
    expect(result.confidence).toBe("high");
    expect(result.stub).toBe(true);
    expect(result.cost.costCents).toBe(0);
  });

  it("searchDomain returns 2 fixture contacts", async () => {
    const result = await provider.searchDomain({ domain: "acme.io" });
    expect(result.contacts).toHaveLength(2);
    expect(result.contacts[0]?.position).toBe("Head of Operations");
    expect(result.contacts[1]?.position).toBe("Founder");
  });
});

describe("FakeLlmProvider", () => {
  it("generate returns valid JSON archetypes by default", async () => {
    const provider = new FakeLlmProvider();
    const result = await provider.generate({
      system: "You are an ICP analyst.",
      prompt: "anything",
      format: "json",
    });
    expect(result.stub).toBe(true);
    expect(() => JSON.parse(result.text)).not.toThrow();
    const parsed = JSON.parse(result.text);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(3);
    expect(parsed[0]).toHaveProperty("industry");
    expect(parsed[0]).toHaveProperty("role");
    expect(parsed[0]).toHaveProperty("buyingSignals");
  });

  it("generate returns custom response when prompt matches map", async () => {
    const custom = new Map([["custom-prompt", "custom-response"]]);
    const provider = new FakeLlmProvider(custom);
    const result = await provider.generate({
      system: "x",
      prompt: "custom-prompt",
    });
    expect(result.text).toBe("custom-response");
  });
});
