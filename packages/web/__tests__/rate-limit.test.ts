// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";
import { hashClientIp, InMemoryRateLimiter } from "../lib/rate-limit";

describe("InMemoryRateLimiter", () => {
  it("allows runs up to the daily cap", async () => {
    const limiter = new InMemoryRateLimiter({ dailyCapCents: 100, dailyRuns: 3 });
    const a = await limiter.reserveRun("ip");
    const b = await limiter.reserveRun("ip");
    const c = await limiter.reserveRun("ip");
    expect(a.allowedRun).toBe(true);
    expect(b.allowedRun).toBe(true);
    expect(c.allowedRun).toBe(true);
  });

  it("refuses runs beyond the daily limit", async () => {
    const limiter = new InMemoryRateLimiter({ dailyCapCents: 100, dailyRuns: 2 });
    await limiter.reserveRun("ip");
    await limiter.reserveRun("ip");
    const denied = await limiter.reserveRun("ip");
    expect(denied.allowedRun).toBe(false);
    expect(denied.remainingRuns).toBe(0);
  });

  it("refuses runs when cost cap is exhausted", async () => {
    const limiter = new InMemoryRateLimiter({ dailyCapCents: 10, dailyRuns: 10 });
    await limiter.reserveRun("ip");
    await limiter.recordCost("ip", 10);
    const denied = await limiter.reserveRun("ip");
    expect(denied.allowedRun).toBe(false);
    expect(denied.remainingCents).toBeLessThanOrEqual(0);
  });

  it("separates buckets by client key", async () => {
    const limiter = new InMemoryRateLimiter({ dailyCapCents: 100, dailyRuns: 1 });
    await limiter.reserveRun("ip-a");
    const otherUser = await limiter.reserveRun("ip-b");
    expect(otherUser.allowedRun).toBe(true);
  });

  it("resets the bucket after 24 hours", async () => {
    let now = 1_000_000;
    const limiter = new InMemoryRateLimiter({
      dailyCapCents: 100,
      dailyRuns: 1,
      now: () => now,
    });
    await limiter.reserveRun("ip");
    const denied = await limiter.reserveRun("ip");
    expect(denied.allowedRun).toBe(false);
    now += 24 * 60 * 60 * 1000 + 1;
    const fresh = await limiter.reserveRun("ip");
    expect(fresh.allowedRun).toBe(true);
  });
});

describe("hashClientIp", () => {
  it("produces a stable 64-char hex hash for the same IP within the same day", () => {
    const h1 = hashClientIp("1.2.3.4", "salt");
    const h2 = hashClientIp("1.2.3.4", "salt");
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[a-f0-9]{64}$/);
  });

  it("changes when the IP changes", () => {
    expect(hashClientIp("1.2.3.4", "salt")).not.toBe(hashClientIp("1.2.3.5", "salt"));
  });

  it("changes when the salt changes", () => {
    expect(hashClientIp("1.2.3.4", "a")).not.toBe(hashClientIp("1.2.3.4", "b"));
  });
});
