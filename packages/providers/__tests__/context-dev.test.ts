// SPDX-License-Identifier: MIT

import { afterEach, describe, expect, it, vi } from "vitest";
import { ContextDevPeopleSearch } from "../src/context-dev";
import {
  ProviderAuthError,
  ProviderNetworkError,
  ProviderQuotaError,
  ProviderRateLimitError,
} from "../src/types";

const json = (status: number, body: unknown, headers: Record<string, string> = {}): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });

const sample = {
  results: [
    {
      name: "Alex Morgan",
      description: "Sales leader helping solar companies grow.",
      profiles: ["https://alexmorgan.example"],
      location: { country_code: "US", region: "California", city: "San Francisco" },
      role: {
        title: "VP of Sales",
        seniority: "executive",
        functions: ["sales"],
        started_on: "2023-06-01",
        company: { name: "Solstice", domain: "solstice.example" },
      },
      years_of_experience: 12,
      is_founder: false,
      skills: ["Enterprise Sales"],
      schools: ["UC Berkeley"],
    },
  ],
  next_cursor: "abc",
  request_id: "3f1c2a6e-8b4d-4c1e-9f0a-2d7b5e6c8a91",
  key_metadata: { credits_consumed: 10, credits_remaining: 990 },
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("ContextDevPeopleSearch", () => {
  it("throws auth error without a key and never calls fetch", async () => {
    vi.stubEnv("CONTEXT_DEV_API_KEY", "");
    const fetchImpl = vi.fn();
    const provider = new ContextDevPeopleSearch({ fetchImpl });
    expect(provider.configured).toBe(false);
    await expect(provider.search({ query: "founders" })).rejects.toBeInstanceOf(ProviderAuthError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("reads the key from CONTEXT_DEV_API_KEY and sends the documented request", async () => {
    vi.stubEnv("CONTEXT_DEV_API_KEY", "ctxt_secret_test");
    const fetchImpl = vi.fn().mockResolvedValue(json(200, sample));
    const provider = new ContextDevPeopleSearch({ fetchImpl });
    await provider.search({
      query: "  VPs of sales at solar companies  ",
      filters: { countries: ["us"], yearsOfExperienceMin: 5 },
      tags: ["icpfinder"],
    });
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.context.dev/v1/people/search");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer ctxt_secret_test");
    expect(JSON.parse(init.body as string)).toEqual({
      query: "VPs of sales at solar companies",
      mode: "fast",
      filters: { countries: ["US"], years_of_experience_min: 5 },
      tags: ["icpfinder"],
    });
  });

  it("maps people, cursor and credits", async () => {
    const onCost = vi.fn();
    const provider = new ContextDevPeopleSearch({
      apiKey: "k",
      costCentsPerCredit: 2,
      onCost,
      fetchImpl: vi.fn().mockResolvedValue(json(200, sample)),
    });
    const result = await provider.search({ query: "solar sales leaders" });
    expect(result.people[0]).toMatchObject({
      name: "Alex Morgan",
      location: { countryCode: "US", city: "San Francisco" },
      role: { title: "VP of Sales", company: { domain: "solstice.example" } },
      isFounder: false,
      matchConfidence: null,
    });
    expect(result.nextCursor).toBe("abc");
    expect(result.creditsRemaining).toBe(990);
    expect(result.cost).toEqual({
      units: 10,
      costCents: 20,
      provider: "context-dev",
      endpoint: "people_search_fast",
    });
    expect(onCost).toHaveBeenCalledWith({ mode: "fast", cost: result.cost, results: 1 });
  });

  it("rejects bad input before spending credits", async () => {
    const fetchImpl = vi.fn();
    const provider = new ContextDevPeopleSearch({ apiKey: "k", fetchImpl });
    await expect(provider.search({ query: " " })).rejects.toBeInstanceOf(RangeError);
    await expect(provider.search({ query: "x".repeat(501) })).rejects.toBeInstanceOf(RangeError);
    await expect(
      provider.search({ query: "ok", filters: { countries: ["USA"] } })
    ).rejects.toBeInstanceOf(RangeError);
    expect(fetchImpl).not.toHaveBeenCalled();
    // ultra allows longer queries
    fetchImpl.mockResolvedValue(json(200, { results: [], request_id: "r" }));
    await provider.search({ query: "x".repeat(501), mode: "ultra" });
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("retries 429 using Retry-After, then succeeds", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(json(429, { error_code: "RATE_LIMITED" }, { "retry-after": "1" }))
      .mockResolvedValueOnce(json(200, sample));
    const provider = new ContextDevPeopleSearch({ apiKey: "k", fetchImpl, retryAfterScaleMs: 0 });
    const result = await provider.search({ query: "q" });
    expect(result.people).toHaveLength(1);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("does not retry when the API says should_retry: false", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      json(429, {
        error_code: "RATE_LIMITED",
        error_data: { should_retry: false, retry_after_seconds: 5 },
      })
    );
    const provider = new ContextDevPeopleSearch({ apiKey: "k", fetchImpl, retryAfterScaleMs: 0 });
    await expect(provider.search({ query: "q" })).rejects.toBeInstanceOf(ProviderRateLimitError);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("maps 401, usage exceeded and 500 to provider errors", async () => {
    const make = (res: Response) =>
      new ContextDevPeopleSearch({ apiKey: "k", fetchImpl: vi.fn().mockResolvedValue(res) });
    await expect(
      make(json(401, { error_code: "UNAUTHORIZED" })).search({ query: "q" })
    ).rejects.toBeInstanceOf(ProviderAuthError);
    await expect(
      make(json(400, { error_code: "USAGE_EXCEEDED" })).search({ query: "q" })
    ).rejects.toBeInstanceOf(ProviderQuotaError);
    await expect(
      make(json(500, { error_code: "INTERNAL_ERROR" })).search({ query: "q" })
    ).rejects.toBeInstanceOf(ProviderNetworkError);
  });

  it("never puts the key in error messages", async () => {
    const provider = new ContextDevPeopleSearch({
      apiKey: "ctxt_secret_dont_leak",
      fetchImpl: vi.fn().mockResolvedValue(json(401, { message: "bad key" })),
    });
    await expect(provider.search({ query: "q" })).rejects.not.toThrow(/ctxt_secret_dont_leak/);
  });
});
