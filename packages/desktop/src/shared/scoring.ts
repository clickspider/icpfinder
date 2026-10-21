// SPDX-License-Identifier: MIT
//
// The match score, in one place, used by the hunt (main) and the live preview
// (renderer). Deterministic: the same checks and the same settings always give
// the same score. Each product (workspace) can tune its own settings.

export interface Scoring {
  /** A company shows only at or above this score. */
  bar: number;
  /** Points for the must-haves (the rest, minus the base, goes to the signal). */
  mustWeight: number;
  /** Credit for a must-have nobody could confirm or rule out (0 to 0.5). */
  unknownCredit: number;
  /** How many days old a buying signal may be and still count as fresh. */
  windowDays: number;
  /** Companies Claude looks at in each search round. */
  candidates: number;
  /** Extra rounds that sharpen the ICP when too few companies pass. */
  rounds: number;
}

export const DEFAULT_SCORING: Scoring = {
  bar: 70,
  mustWeight: 60,
  unknownCredit: 0.15,
  windowDays: 120,
  candidates: 10,
  rounds: 1,
};

/** Every score starts with this, so a perfect fit is exactly 100. */
export const BASE = 10;

export const scoringOf = (s?: Partial<Scoring>): Scoring => ({ ...DEFAULT_SCORING, ...s });

export interface ScoreInput {
  checks: Array<{ verdict: "yes" | "no" | "unknown" }>;
  signalConfirmed: boolean;
  signalDate?: string;
  dealBreaker?: string | null;
}

/**
 * 0 for any proven "no" or a deal-breaker. Otherwise:
 * base + mustWeight × (share of must-haves confirmed, unknowns get partial credit)
 * + signal points. A confirmed signal needs an event date: up to 30 days old = full,
 * then down to half at the end of the window, older = half. No date or unconfirmed = a sixth.
 */
export const score = (input: ScoreInput, cfg: Scoring, now = new Date()): number => {
  const { checks, signalConfirmed, signalDate, dealBreaker } = input;
  if (dealBreaker || checks.some((c) => c.verdict === "no")) return 0;
  const signalWeight = 100 - BASE - cfg.mustWeight;
  const must = checks.length
    ? checks.reduce((n, c) => n + (c.verdict === "yes" ? 1 : cfg.unknownCredit), 0) / checks.length
    : 0.4;
  const age = signalDate ? (now.getTime() - Date.parse(signalDate)) / 86_400_000 : Number.NaN;
  const fresh = Number.isFinite(age) && age >= -2 && age <= cfg.windowDays;
  const recency = fresh
    ? 1 - 0.5 * Math.max(0, (age - 30) / Math.max(1, cfg.windowDays - 30))
    : 0.5;
  // An undated signal counts as unconfirmed: the event date, not the article date, makes it real.
  const signal =
    signalConfirmed && Number.isFinite(age) ? signalWeight * recency : signalWeight / 6;
  return Math.round(BASE + must * cfg.mustWeight + signal);
};
