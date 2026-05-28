// SPDX-License-Identifier: MIT
//
// Per-IP daily quota for /api/deepen. Operator-paid: 25/day default. BYOK
// (user supplied Gemini): unlimited. In-memory by default with the same
// daily-bucket pattern as rate-limit.ts — zero-config for dev.

const DEFAULT_DAILY = 25;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

interface Bucket {
  resetAt: number;
  count: number;
}

const buckets = new Map<string, Bucket>();

function bucketFor(key: string, now: number): Bucket {
  const existing = buckets.get(key);
  if (existing && existing.resetAt > now) return existing;
  const fresh: Bucket = { resetAt: now + ONE_DAY_MS, count: 0 };
  buckets.set(key, fresh);
  return fresh;
}

export interface DeepenQuotaCheck {
  allowed: boolean;
  remaining: number;
  limit: number;
}

export function reserveDeepen(clientIpHash: string, byok: boolean): DeepenQuotaCheck {
  if (byok) return { allowed: true, remaining: Number.POSITIVE_INFINITY, limit: Number.POSITIVE_INFINITY };
  const limit = Number(process.env.ICPFINDER_DEEPEN_PER_IP_PER_DAY ?? DEFAULT_DAILY);
  const b = bucketFor(clientIpHash, Date.now());
  if (b.count >= limit) {
    return { allowed: false, remaining: 0, limit };
  }
  b.count += 1;
  return { allowed: true, remaining: limit - b.count, limit };
}
