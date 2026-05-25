// SPDX-License-Identifier: MIT
//
// UpstashRateLimiter — RateLimiter backed by Upstash Redis REST API.
//
// Two counters per client key per UTC day:
//   icpf:runs:<yyyy-mm-dd>:<hash>   incremented on reserveRun
//   icpf:cost:<yyyy-mm-dd>:<hash>   incremented (in cents * 100, integer)
//                                   on recordCost so we don't lose precision
//
// EXPIRE both keys to 25h on first increment so they self-clean. The
// runtime never needs to GC.
//
// Falls back to throwing rather than silently allowing — a misconfigured
// Upstash should hard-fail in prod so the operator notices, not let an
// abuser through.

import type { RateLimitCheck, RateLimiter } from "./rate-limit";

export interface UpstashRateLimiterOptions {
  url: string;
  token: string;
  dailyCapCents: number;
  dailyRuns: number;
  /** Override fetch (testing). */
  fetchImpl?: typeof fetch;
  /** Override clock (testing). */
  now?: () => Date;
}

interface UpstashResult {
  result: number | string | null;
  error?: string;
}

const ONE_DAY_SECONDS = 25 * 60 * 60;
/** Multiplier to store cents-with-2-decimals as an integer. */
const COST_SCALE = 100;

export class UpstashRateLimiter implements RateLimiter {
  private readonly url: string;
  private readonly token: string;
  private readonly dailyCapCents: number;
  private readonly dailyRuns: number;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => Date;

  constructor(opts: UpstashRateLimiterOptions) {
    if (!opts.url || !opts.token) {
      throw new Error("UpstashRateLimiter requires url + token");
    }
    this.url = opts.url.replace(/\/+$/, "");
    this.token = opts.token;
    this.dailyCapCents = opts.dailyCapCents;
    this.dailyRuns = opts.dailyRuns;
    this.fetchImpl = opts.fetchImpl ?? globalThis.fetch;
    this.now = opts.now ?? (() => new Date());
  }

  private dayKey(): string {
    return this.now().toISOString().slice(0, 10);
  }

  private runsKey(hash: string): string {
    return `icpf:runs:${this.dayKey()}:${hash}`;
  }

  private costKey(hash: string): string {
    return `icpf:cost:${this.dayKey()}:${hash}`;
  }

  private async pipeline(commands: Array<Array<string | number>>): Promise<UpstashResult[]> {
    const response = await this.fetchImpl(`${this.url}/pipeline`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify(commands),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Upstash pipeline failed: ${response.status} ${body.slice(0, 200)}`);
    }
    return (await response.json()) as UpstashResult[];
  }

  async reserveRun(clientIpHash: string): Promise<RateLimitCheck> {
    const runsK = this.runsKey(clientIpHash);
    const costK = this.costKey(clientIpHash);
    const results = await this.pipeline([
      ["INCR", runsK],
      ["EXPIRE", runsK, ONE_DAY_SECONDS],
      ["GET", costK],
    ]);

    const runsAfter = Number(results[0]?.result ?? 0);
    const costRaw = results[2]?.result;
    const costCentsScaled = costRaw == null ? 0 : Number(costRaw);
    const costCents = costCentsScaled / COST_SCALE;

    const remainingRuns = this.dailyRuns - runsAfter;
    const remainingCents = this.dailyCapCents - costCents;

    if (runsAfter > this.dailyRuns || remainingCents <= 0) {
      // Roll the INCR back so a refused request doesn't burn quota.
      await this.pipeline([["DECR", runsK]]);
      return {
        allowedRun: false,
        remainingRuns: Math.max(0, remainingRuns + 1),
        remainingCents,
      };
    }

    return { allowedRun: true, remainingRuns, remainingCents };
  }

  async recordCost(clientIpHash: string, cents: number): Promise<void> {
    if (cents <= 0) return;
    const costK = this.costKey(clientIpHash);
    const scaled = Math.round(cents * COST_SCALE);
    await this.pipeline([
      ["INCRBY", costK, scaled],
      ["EXPIRE", costK, ONE_DAY_SECONDS],
    ]);
  }
}
