// SPDX-License-Identifier: MIT
//
// What IcpFinder itself used from the founder's AI plan. Generic on purpose:
// every provider (Claude Code today, Codex later) reports the same shape.

export type Provider = "claude" | "codex";

export interface UsageTotals {
  calls: number;
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  webSearches: number;
  /** List-price equivalent, for scale. A subscription is not charged per call. */
  costUsd: number;
}

export const emptyTotals = (): UsageTotals => ({
  calls: 0,
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
  webSearches: 0,
  costUsd: 0,
});

/** One row per day × product × task × provider × model, so storage stays small. */
export interface UsageRow extends UsageTotals {
  day: string;
  ws: string;
  task: string;
  provider: Provider;
  model: string;
}

export const tokensOf = (t: UsageTotals): number => t.input + t.output + t.cacheRead + t.cacheWrite;

export const add = (a: UsageTotals, b: Partial<UsageTotals>): UsageTotals => ({
  calls: a.calls + (b.calls ?? 0),
  input: a.input + (b.input ?? 0),
  output: a.output + (b.output ?? 0),
  cacheRead: a.cacheRead + (b.cacheRead ?? 0),
  cacheWrite: a.cacheWrite + (b.cacheWrite ?? 0),
  webSearches: a.webSearches + (b.webSearches ?? 0),
  costUsd: a.costUsd + (b.costUsd ?? 0),
});

/** Sum rows from the last `days` days, grouped by a key. */
export const groupBy = (
  rows: UsageRow[],
  days: number,
  key: (r: UsageRow) => string,
  now = new Date()
): Array<[string, UsageTotals]> => {
  const from = new Date(now.getTime() - (days - 1) * 86_400_000).toISOString().slice(0, 10);
  const m = new Map<string, UsageTotals>();
  for (const r of rows) {
    if (r.day < from) continue;
    const k = key(r);
    m.set(k, add(m.get(k) ?? emptyTotals(), r));
  }
  return [...m.entries()].sort((a, b) => tokensOf(b[1]) - tokensOf(a[1]));
};

export const fmtTokens = (n: number): string =>
  n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : String(n);

/** A provider's plan limits as the provider itself reports them. */
export interface PlanUsage {
  provider: Provider;
  plan: string;
  windows: Array<{
    label: string;
    pct: number;
    resets: string;
    /** Estimated part of `pct` that IcpFinder used. */
    appPct?: number;
  }>;
  at: string;
}
