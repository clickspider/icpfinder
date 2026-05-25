// SPDX-License-Identifier: MIT

import { describe, expect, it, vi } from "vitest";
import { HunterEmailProvider } from "../src/hunter";
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

describe("HunterEmailProvider — stub mode (no apiKey)", () => {
  it("returns deterministic stub email from findEmail", async () => {
    const provider = new HunterEmailProvider();
    const result = await provider.findEmail({
      domain: "example.com",
      firstName: "Sarah",
      lastName: "Chen",
    });
    expect(provider.stub).toBe(true);
    expect(result.stub).toBe(true);
    expect(result.email).toBe("sarah@example.com");
    expect(result.confidence).toBe("high");
    expect(result.cost.units).toBe(0);
    expect(result.cost.costCents).toBe(0);
  });

  it("returns stub verifyEmail result", async () => {
    const provider = new HunterEmailProvider();
    const result = await provider.verifyEmail({ email: "foo@bar.com" });
    expect(result.stub).toBe(true);
    expect(result.confidence).toBe("high");
    expect(result.cost.units).toBe(0);
  });

  it("returns stub searchDomain result with a single contact", async () => {
    const provider = new HunterEmailProvider();
    const result = await provider.searchDomain({ domain: "example.com" });
    expect(result.stub).toBe(true);
    expect(result.contacts).toHaveLength(1);
    expect(result.contacts[0]?.email).toBe("founder@example.com");
  });

  it("invokes onCost logger even in stub mode", async () => {
    const onCost = vi.fn();
    const provider = new HunterEmailProvider({ onCost });
    await provider.findEmail({ domain: "example.com", firstName: "A", lastName: "B" });
    expect(onCost).toHaveBeenCalledOnce();
    expect(onCost.mock.calls[0]?.[0].endpoint).toBe("email_finder");
    expect(onCost.mock.calls[0]?.[0].cost.units).toBe(0);
  });
});

describe("HunterEmailProvider — live mode (mocked fetch)", () => {
  it("calls Hunter API and parses email-finder response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      okResponse({
        data: { email: "ceo@stripe.com", score: 95, verification: { status: "valid" } },
      })
    );
    const provider = new HunterEmailProvider({ apiKey: "test_key", fetchImpl });

    const result = await provider.findEmail({
      domain: "stripe.com",
      firstName: "Patrick",
      lastName: "Collison",
    });

    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(result.stub).toBe(false);
    expect(result.email).toBe("ceo@stripe.com");
    expect(result.score).toBe(95);
    expect(result.confidence).toBe("high");
    expect(result.cost.units).toBe(1);
    expect(result.cost.costCents).toBe(7);
  });

  it("throws ProviderAuthError on 401", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(errorResponse(401));
    const provider = new HunterEmailProvider({ apiKey: "bad_key", fetchImpl });

    await expect(
      provider.findEmail({ domain: "x.com", firstName: "A", lastName: "B" })
    ).rejects.toThrow(ProviderAuthError);
  });

  it("throws ProviderRateLimitError after exhausting 429 retries", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(errorResponse(429));
    const provider = new HunterEmailProvider({ apiKey: "k", fetchImpl });

    await expect(
      provider.findEmail({ domain: "x.com", firstName: "A", lastName: "B" })
    ).rejects.toThrow(ProviderRateLimitError);
  }, 15000);

  it("retries once on 5xx server error", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(errorResponse(503))
      .mockResolvedValueOnce(
        okResponse({ data: { email: "x@y.com", score: 80, verification: { status: "valid" } } })
      );
    const provider = new HunterEmailProvider({ apiKey: "k", fetchImpl });

    const result = await provider.findEmail({
      domain: "y.com",
      firstName: "X",
      lastName: "Y",
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result.email).toBe("x@y.com");
  });

  it("respects custom costCentsPerCredit", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        okResponse({ data: { email: "a@b.com", score: 90, verification: { status: "valid" } } })
      );
    const provider = new HunterEmailProvider({
      apiKey: "k",
      costCentsPerCredit: 5,
      fetchImpl,
    });

    const result = await provider.findEmail({
      domain: "b.com",
      firstName: "A",
      lastName: "Z",
    });

    expect(result.cost.costCents).toBe(5);
  });

  it("parses searchDomain response into normalized contacts", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      okResponse({
        data: {
          emails: [
            {
              value: "ceo@acme.com",
              first_name: "Ada",
              last_name: "Lovelace",
              position: "CEO",
              seniority: "executive",
              confidence: 92,
            },
            {
              value: "cto@acme.com",
              first_name: "Grace",
              last_name: "Hopper",
              position: "CTO",
              seniority: "executive",
              confidence: 78,
            },
          ],
        },
      })
    );
    const provider = new HunterEmailProvider({ apiKey: "k", fetchImpl });

    const result = await provider.searchDomain({ domain: "acme.com" });
    expect(result.contacts).toHaveLength(2);
    expect(result.contacts[0]?.email).toBe("ceo@acme.com");
    expect(result.contacts[0]?.confidence).toBe("high");
    expect(result.contacts[1]?.confidence).toBe("medium");
  });
});

describe("HunterEmailProvider — domain normalization", () => {
  it("strips protocol and path from domain input", async () => {
    let capturedUrl = "";
    const fetchImpl = vi.fn().mockImplementation((url: string) => {
      capturedUrl = url;
      return Promise.resolve(
        okResponse({ data: { email: "a@b.com", score: 90, verification: { status: "valid" } } })
      );
    });
    const provider = new HunterEmailProvider({ apiKey: "k", fetchImpl });

    await provider.findEmail({
      domain: "https://Acme.com/about",
      firstName: "A",
      lastName: "B",
    });

    const parsed = new URL(capturedUrl);
    expect(parsed.searchParams.get("domain")).toBe("acme.com");
    expect(parsed.searchParams.get("first_name")).toBe("A");
    expect(capturedUrl).not.toContain("about");
  });
});
