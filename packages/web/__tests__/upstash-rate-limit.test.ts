// SPDX-License-Identifier: MIT

import { describe, expect, it, vi } from "vitest";
import { UpstashRateLimiter } from "../lib/upstash-rate-limit";

const fixedDay = new Date("2026-05-25T12:00:00Z");

const mockFetchSequence = (responses: Array<unknown[]>): typeof fetch => {
  const fn = vi.fn();
  for (const body of responses) {
    fn.mockResolvedValueOnce(
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );
  }
  return fn as unknown as typeof fetch;
};

describe("UpstashRateLimiter", () => {
  it("rejects construction without url + token", () => {
    expect(
      () => new UpstashRateLimiter({ url: "", token: "t", dailyCapCents: 100, dailyRuns: 5 })
    ).toThrow();
    expect(
      () => new UpstashRateLimiter({ url: "u", token: "", dailyCapCents: 100, dailyRuns: 5 })
    ).toThrow();
  });

  it("issues pipeline INCR + EXPIRE + GET on reserveRun", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ result: 1 }, { result: "OK" }, { result: null }]), {
        status: 200,
      })
    );
    const limiter = new UpstashRateLimiter({
      url: "https://r/",
      token: "t",
      dailyCapCents: 100,
      dailyRuns: 5,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      now: () => fixedDay,
    });

    const check = await limiter.reserveRun("hash-a");

    expect(check.allowedRun).toBe(true);
    expect(check.remainingRuns).toBe(4);
    expect(check.remainingCents).toBe(100);

    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://r/pipeline");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer t");
    const body = JSON.parse(init.body as string);
    expect(body).toEqual([
      ["INCR", "icpf:runs:2026-05-25:hash-a"],
      ["EXPIRE", "icpf:runs:2026-05-25:hash-a", 90_000],
      ["GET", "icpf:cost:2026-05-25:hash-a"],
    ]);
  });

  it("refuses run + decrements counter when run quota exhausted", async () => {
    const fetchImpl = mockFetchSequence([
      [{ result: 6 }, { result: "OK" }, { result: null }], // pipeline → over cap
      [{ result: 5 }], // DECR rollback
    ]);
    const limiter = new UpstashRateLimiter({
      url: "https://r",
      token: "t",
      dailyCapCents: 100,
      dailyRuns: 5,
      fetchImpl,
      now: () => fixedDay,
    });

    const check = await limiter.reserveRun("hash-a");
    expect(check.allowedRun).toBe(false);
    expect(check.remainingRuns).toBe(0);
    expect((fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(2);
  });

  it("refuses when cost cap exhausted and rolls back the run counter", async () => {
    const fetchImpl = mockFetchSequence([
      // costRaw = 10000 → 100 cents → equals cap → remainingCents <= 0 → refuse
      [{ result: 1 }, { result: "OK" }, { result: "10000" }],
      [{ result: 0 }],
    ]);
    const limiter = new UpstashRateLimiter({
      url: "https://r",
      token: "t",
      dailyCapCents: 100,
      dailyRuns: 5,
      fetchImpl,
      now: () => fixedDay,
    });
    const check = await limiter.reserveRun("hash-a");
    expect(check.allowedRun).toBe(false);
    expect(check.remainingCents).toBeLessThanOrEqual(0);
  });

  it("recordCost issues INCRBY scaled by 100", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify([{ result: 42 }, { result: "OK" }]), { status: 200 })
      );
    const limiter = new UpstashRateLimiter({
      url: "https://r",
      token: "t",
      dailyCapCents: 100,
      dailyRuns: 5,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      now: () => fixedDay,
    });
    await limiter.recordCost("hash-a", 0.42);
    const body = JSON.parse((fetchImpl.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body).toEqual([
      ["INCRBY", "icpf:cost:2026-05-25:hash-a", 42],
      ["EXPIRE", "icpf:cost:2026-05-25:hash-a", 90_000],
    ]);
  });

  it("recordCost is a no-op for zero/negative cents", async () => {
    const fetchImpl = vi.fn();
    const limiter = new UpstashRateLimiter({
      url: "https://r",
      token: "t",
      dailyCapCents: 100,
      dailyRuns: 5,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      now: () => fixedDay,
    });
    await limiter.recordCost("hash-a", 0);
    await limiter.recordCost("hash-a", -5);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("throws when Upstash returns non-2xx", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("nope", { status: 500 }));
    const limiter = new UpstashRateLimiter({
      url: "https://r",
      token: "t",
      dailyCapCents: 100,
      dailyRuns: 5,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      now: () => fixedDay,
    });
    await expect(limiter.reserveRun("hash-a")).rejects.toThrow(/Upstash pipeline failed/);
  });
});
