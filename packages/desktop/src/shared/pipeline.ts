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

export type When = "today" | "week" | "month" | "older" | "undated";

export const WHEN: Array<{ key: When; label: string }> = [
  { key: "today", label: "Act today" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "older", label: "Older" },
  { key: "undated", label: "No date" },
];

/** How fresh a company's moment is, as a filter key. */
export const whenOf = (c: Company, now = Date.now()): When => {
  const t = timingOf(c, now);
  if (t.label === "No date") return "undated";
  return (["today", "week", "month", "older"] as const)[Math.min(t.rank, 3)] ?? "older";
};

/** The board order: freshest moment first, then best match. */
export const byReachFirst =
  (now = Date.now()) =>
  (a: Company, z: Company): number =>
    WHEN.findIndex((w) => w.key === whenOf(a, now)) -
      WHEN.findIndex((w) => w.key === whenOf(z, now)) || (z.match ?? 0) - (a.match ?? 0);
