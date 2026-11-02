// SPDX-License-Identifier: MIT
//
// The pipeline: where each company stands with the founder, and who to reach
// first. Pure, so the board, the rows and the tests agree.

import { timingOf } from "./timing";
import type { Company } from "./types";

/** What the founder sets by hand. "Follow up" is never set: it is a contacted company gone quiet. */
export type SetStage = "contacted" | "talking" | "won" | "lost";
export type PipelineStage = "new" | "approved" | "followup" | SetStage;

export const FOLLOW_UP_DAYS = 5;

export const STAGE_LABEL: Record<PipelineStage, string> = {
  new: "New",
  approved: "Approved",
  contacted: "Contacted",
  followup: "Follow up",
  talking: "Talking",
  won: "Customer",
  lost: "Not now",
};

/** Where a company stands today. */
export const stageOf = (c: Company, now = Date.now()): PipelineStage => {
  const p = c.pipeline;
  if (p?.stage === "contacted" && now - Date.parse(p.at) > FOLLOW_UP_DAYS * 86_400_000)
    return "followup";
  if (p) return p.stage;
  return c.approval === "approved" ? "approved" : "new";
};

export type ReachBucket = {
  key: "today" | "week" | "month" | "older" | "undated";
  label: string;
  hint: string;
  companies: Company[];
};

/**
 * Who to reach first: companies not contacted yet, grouped by how fresh their moment is.
 * Rejected ones are left out. Each bucket keeps the best match first.
 */
export const reachFirst = (companies: Company[], now = Date.now()): ReachBucket[] => {
  const buckets: ReachBucket[] = [
    { key: "today", label: "Act today", hint: "2 days", companies: [] },
    { key: "week", label: "This week", hint: "7 days", companies: [] },
    { key: "month", label: "This month", hint: "30 days", companies: [] },
    { key: "older", label: "Older", hint: "older", companies: [] },
    { key: "undated", label: "No date", hint: "?", companies: [] },
  ];
  for (const c of companies) {
    if (c.approval === "rejected") continue;
    const s = stageOf(c, now);
    if (s !== "new" && s !== "approved") continue;
    const t = timingOf(c, now);
    const i = t.label === "No date" ? 4 : Math.min(t.rank, 3);
    buckets[i]?.companies.push(c);
  }
  for (const b of buckets) b.companies.sort((a, z) => (z.match ?? 0) - (a.match ?? 0));
  return buckets;
};
