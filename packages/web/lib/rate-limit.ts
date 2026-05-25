// SPDX-License-Identifier: MIT
//
// In-memory rate limit + daily cost cap, keyed by hashed client IP.
//
// Production swap: implement the same RateLimiter interface against
// Upstash Redis (INCR + EXPIRE) and dependency-inject. The route
// handler never touches the concrete implementation.
//
// Why in-memory by default: zero-config local dev + Vercel preview
// deploys. Single-region deploys see the same memory; multi-region
// requires Upstash. Stated explicitly in README.

import { createHash } from "node:crypto";

export interface RateLimitCheck {
  /** Allowed to start a new run? */
  allowedRun: boolean;
  /** Cents remaining in the daily budget. Negative if already over. */
  remainingCents: number;
  /** Runs remaining in the daily quota. */
  remainingRuns: number;
}

export interface RateLimiter {
  /** Reserve one run slot (no cost reservation yet). */
  reserveRun(clientIpHash: string): Promise<RateLimitCheck>;
  /** Record cost incurred so daily cap stays accurate. */
  recordCost(clientIpHash: string, cents: number): Promise<void>;
}

export interface RateLimiterOptions {
  dailyCapCents: number;
  dailyRuns: number;
  /** Override clock (testing). */
  now?: () => number;
}

interface Bucket {
  /** Epoch ms when the bucket resets to zero. */
  resetAt: number;
  runs: number;
  costCents: number;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export class InMemoryRateLimiter implements RateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private readonly dailyCapCents: number;
  private readonly dailyRuns: number;
  private readonly now: () => number;

  constructor(opts: RateLimiterOptions) {
    this.dailyCapCents = opts.dailyCapCents;
    this.dailyRuns = opts.dailyRuns;
    this.now = opts.now ?? Date.now;
  }

  private getBucket(key: string): Bucket {
    const t = this.now();
    const existing = this.buckets.get(key);
    if (existing && existing.resetAt > t) return existing;
    const fresh: Bucket = { resetAt: t + ONE_DAY_MS, runs: 0, costCents: 0 };
    this.buckets.set(key, fresh);
    return fresh;
  }

  async reserveRun(clientIpHash: string): Promise<RateLimitCheck> {
    const bucket = this.getBucket(clientIpHash);
    const remainingRuns = this.dailyRuns - bucket.runs;
    const remainingCents = this.dailyCapCents - bucket.costCents;
    if (remainingRuns <= 0 || remainingCents <= 0) {
      return { allowedRun: false, remainingRuns, remainingCents };
    }
    bucket.runs += 1;
    return {
      allowedRun: true,
      remainingRuns: remainingRuns - 1,
      remainingCents,
    };
  }

  async recordCost(clientIpHash: string, cents: number): Promise<void> {
    const bucket = this.getBucket(clientIpHash);
    bucket.costCents += cents;
  }
}

/**
 * Hash the raw IP with a daily-rotating salt so logs/database rows
 * are not directly correlated to a user across days. Salt rotation is
 * coarse (UTC day boundary) — sufficient for abuse mitigation without
 * preserving long-term identifiers.
 */
export const hashClientIp = (ip: string, saltSource?: string): string => {
  const day = new Date().toISOString().slice(0, 10);
  const salt = saltSource ?? process.env.ICPFINDER_IP_SALT ?? "icpfinder-default-salt";
  return createHash("sha256").update(`${day}:${salt}:${ip}`).digest("hex");
};

/** Default singleton — module-scoped, survives across requests in dev/prod. */
let defaultLimiter: RateLimiter | null = null;

export const getDefaultRateLimiter = (): RateLimiter => {
  if (!defaultLimiter) {
    defaultLimiter = new InMemoryRateLimiter({
      dailyCapCents: Number(process.env.ICPFINDER_DAILY_CAP_CENTS ?? 500),
      dailyRuns: Number(process.env.ICPFINDER_DAILY_RUNS ?? 20),
    });
  }
  return defaultLimiter;
};
