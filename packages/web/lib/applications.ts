// SPDX-License-Identifier: MIT
//
// Beta applications for icpfinder.dev/next. The beta is for builders who
// will use it now: founders with no sales team, a live product and real
// shipping experience. Answers are scored here so review starts sorted;
// nobody is auto-rejected, the tier only orders the list.

import { appendFile, mkdir } from "node:fs/promises";
import { OPTIONS } from "./apply-options";
import { getPrisma } from "./prisma";

type Opt = typeof OPTIONS;
export interface ApplicationInput {
  name: string;
  email: string;
  productUrl: string;
  profileUrl: string;
  role: keyof Opt["role"];
  salesTeam: keyof Opt["salesTeam"];
  stage: keyof Opt["stage"];
  years: keyof Opt["years"];
  agent: keyof Opt["agent"];
  firstWeek: string;
}

const POINTS = {
  role: { founder: 3, solo: 3, employee: 0, agency: 0, other: 0 },
  salesTeam: { none: 3, small: 1, team: 0 },
  stage: { idea: 0, live: 2, paying: 3, scaling: 2 },
  years: { lt1: 0, y1to3: 2, gt3: 3 },
  agent: { daily: 2, sometimes: 1, no: 0 },
} as const;

export type Tier = "priority" | "review" | "later";

/** 0..15 from the answers, plus 1 for a concrete first-week plan. */
export function scoreApplication(a: ApplicationInput): { score: number; tier: Tier } {
  const score =
    POINTS.role[a.role] +
    POINTS.salesTeam[a.salesTeam] +
    POINTS.stage[a.stage] +
    POINTS.years[a.years] +
    POINTS.agent[a.agent] +
    (a.firstWeek.trim().length >= 80 ? 1 : 0);
  const builder = POINTS.role[a.role] > 0 && a.salesTeam !== "team" && a.stage !== "idea";
  const tier: Tier =
    builder && score >= 11 ? "priority" : builder && score >= 8 ? "review" : "later";
  return { score, tier };
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const pick = <K extends keyof Opt>(k: K, v: unknown) =>
  typeof v === "string" && v in OPTIONS[k] ? (v as keyof Opt[K]) : null;
const isUrl = (v: string) => {
  try {
    const u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
    return u.hostname.includes(".");
  } catch {
    return false;
  }
};

/** Validates untrusted form JSON. Returns the input or the first problem. */
export function parseApplication(body: Record<string, unknown>): ApplicationInput | string {
  const a = {
    name: str(body.name, 120),
    email: str(body.email, 200).toLowerCase(),
    productUrl: str(body.productUrl, 300),
    profileUrl: str(body.profileUrl, 300),
    role: pick("role", body.role),
    salesTeam: pick("salesTeam", body.salesTeam),
    stage: pick("stage", body.stage),
    years: pick("years", body.years),
    agent: pick("agent", body.agent),
    firstWeek: str(body.firstWeek, 2000),
  };
  if (!a.name) return "Add your name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email)) return "Add a real email.";
  if (!isUrl(a.productUrl)) return "Add the link to what you built.";
  if (!isUrl(a.profileUrl)) return "Add your LinkedIn, GitHub or X link.";
  if (!a.role || !a.salesTeam || !a.stage || !a.years || !a.agent) return "Answer every question.";
  if (a.firstWeek.length < 30) return "Tell us in a sentence or two what you will use it for.";
  return a as ApplicationInput;
}

/**
 * Saves to Postgres when DATABASE_URL is set (prod), else to a local
 * JSONL file so `next dev` works without a database. Re-applying with
 * the same email updates the earlier answers.
 */
export async function saveApplication(a: ApplicationInput): Promise<Tier> {
  const { score, tier } = scoreApplication(a);
  const row = { ...a, score, tier };
  const prisma = getPrisma();
  if (prisma) {
    await prisma.application.upsert({ where: { email: a.email }, create: row, update: row });
  } else {
    await mkdir(".data", { recursive: true });
    await appendFile(
      ".data/applications.jsonl",
      `${JSON.stringify({ ...row, at: new Date().toISOString() })}\n`
    );
  }
  return tier;
}
