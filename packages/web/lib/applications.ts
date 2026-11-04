// SPDX-License-Identifier: MIT
//
// Beta applications for icpfinder.dev/next. The form asks three things:
// the tools they use today, their biggest challenge, and name + work
// email. Answers are scored here so review starts sorted; nobody is
// auto-rejected, the tier only orders the list.

import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { isWorkEmail, TOOLS, type ToolId } from "./apply-options";
import { getPrisma } from "./prisma";

export interface ApplicationInput {
  name: string;
  email: string;
  tools: ToolId[];
  challenge: string;
}

export type Tier = "priority" | "review" | "later";

/** 0..5: a work email (2), sales tools in use today (up to 2), a concrete challenge (1). */
export function scoreApplication(a: ApplicationInput): { score: number; tier: Tier } {
  const used = a.tools.filter((t) => t !== "other").length;
  const score =
    (isWorkEmail(a.email) ? 2 : 0) + Math.min(used, 2) + (a.challenge.trim().length >= 40 ? 1 : 0);
  const tier: Tier = score >= 4 ? "priority" : score >= 2 ? "review" : "later";
  return { score, tier };
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Validates untrusted form JSON. Returns the input or the first problem. */
export function parseApplication(body: Record<string, unknown>): ApplicationInput | string {
  const raw = Array.isArray(body.tools) ? body.tools : [body.tools];
  const tools = [...new Set(raw)].filter((t): t is ToolId => typeof t === "string" && t in TOOLS);
  const a = {
    name: str(body.name, 120),
    email: str(body.email, 200).toLowerCase(),
    tools,
    challenge: str(body.challenge, 300),
  };
  if (!a.tools.length) return "Pick at least one tool.";
  if (a.challenge.length < 3) return "Tell us your biggest challenge, in a few words.";
  if (!a.name) return "Add your name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email)) return "Add your work email.";
  return a;
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

export interface ApplicationRow extends ApplicationInput {
  /** Answers of the first, longer form (Oct 2026); null on newer rows. */
  productUrl?: string | null;
  profileUrl?: string | null;
  role?: string | null;
  salesTeam?: string | null;
  stage?: string | null;
  years?: string | null;
  agent?: string | null;
  firstWeek?: string | null;
  id: string;
  createdAt: string;
  score: number;
  tier: Tier;
  invitedAt: string | null;
}

const LOCAL = ".data/applications.jsonl";
const readLocal = async (): Promise<ApplicationRow[]> => {
  const text = await readFile(LOCAL, "utf8").catch(() => "");
  const byEmail = new Map<string, ApplicationRow>();
  for (const line of text.split("\n").filter(Boolean)) {
    const r = JSON.parse(line);
    byEmail.set(r.email, {
      invitedAt: null,
      tools: [],
      challenge: "",
      ...r,
      id: r.email,
      createdAt: r.createdAt ?? r.at,
    });
  }
  return [...byEmail.values()];
};

const TIER_ORDER: Record<Tier, number> = { priority: 0, review: 1, later: 2 };

/** All applications, best tier first, then highest score, then newest. */
export async function listApplications(): Promise<ApplicationRow[]> {
  const prisma = getPrisma();
  const rows: ApplicationRow[] = prisma
    ? (await prisma.application.findMany()).map((r) => ({
        ...(r as unknown as ApplicationRow),
        createdAt: r.createdAt.toISOString(),
        invitedAt: r.invitedAt?.toISOString() ?? null,
      }))
    : await readLocal();
  return rows.sort(
    (a, b) =>
      TIER_ORDER[a.tier] - TIER_ORDER[b.tier] ||
      b.score - a.score ||
      b.createdAt.localeCompare(a.createdAt)
  );
}

export async function markInvited(id: string): Promise<ApplicationRow | null> {
  const prisma = getPrisma();
  const now = new Date();
  if (prisma) {
    const r = await prisma.application
      .update({ where: { id }, data: { invitedAt: now } })
      .catch(() => null);
    return r
      ? ({ ...(r as unknown as ApplicationRow), invitedAt: now.toISOString() } as ApplicationRow)
      : null;
  }
  const rows = await readLocal();
  const row = rows.find((r) => r.id === id);
  if (!row) return null;
  row.invitedAt = now.toISOString();
  await writeFile(
    LOCAL,
    `${rows.map((r) => JSON.stringify({ ...r, at: r.createdAt })).join("\n")}\n`
  );
  return row;
}

export async function findApplication(id: string): Promise<ApplicationRow | null> {
  return (await listApplications()).find((r) => r.id === id) ?? null;
}
