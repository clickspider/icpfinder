// SPDX-License-Identifier: MIT
//
// People first, timing first: who to talk to at a company, and how fresh the
// moment is. Pure, so the list and its tests agree.

import type { Company } from "./types";

/** The person to talk to: the researched contact, else the handle of the post we found them by. */
export const whoAt = (c: Company): string | undefined => {
  const f = c.research?.findings;
  const person =
    f?.find((x) => x.kind === "person" && x.status === "proven" && x.person)?.person ??
    f?.find((x) => x.kind === "person" && x.person)?.person;
  if (person?.name) return person.name;
  const handle = c.reach
    ?.find((l) => l.kind === "hn" || l.kind === "x")
    ?.url.match(/(?:[?&]id=|x\.com\/)([\w-]+)/)?.[1];
  return handle || undefined;
};

export type Timing = { label: string; rank: number; tone: "now" | "week" | "quiet" };

/** How fresh the buying moment is, from the event date of the signal. Undated = quiet. */
export const timingOf = (c: Company, now = Date.now()): Timing => {
  const date = c.signals?.[0]?.date ?? c.trigger?.date;
  const days = date ? (now - Date.parse(date)) / 86_400_000 : Number.NaN;
  if (!Number.isFinite(days)) return { label: "No date", rank: 3, tone: "quiet" };
  if (days <= 2) return { label: "Act today", rank: 0, tone: "now" };
  if (days <= 7) return { label: "This week", rank: 1, tone: "week" };
  if (days <= 30) return { label: "This month", rank: 2, tone: "quiet" };
  return { label: `${Math.round(days / 7)} weeks ago`, rank: 3, tone: "quiet" };
};
