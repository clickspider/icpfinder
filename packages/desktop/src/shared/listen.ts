// SPDX-License-Identifier: MIT
//
// Listening ("Noticed"): each morning, read where a profile's people talk, keep
// the posts that match what the founder listens for, and show the person, what
// they said and why it matched. Keywords sort first (no AI); AI only checks the
// few posts that pass. Pure helpers here, so they can be tested.

export type ListenSource = "hn" | "reddit" | "x" | "linkedin";

export interface ListenCategory {
  id: string;
  /** Plain name the founder reads, e.g. "Launched, no customers yet". */
  name: string;
  /** Words and phrases people really write, used as search queries and to sort posts. */
  keywords: string[];
  on: boolean;
}

export interface Listen {
  on: boolean;
  categories: ListenCategory[];
  /** Subreddits without "r/", e.g. "SaaS". Empty = all of Reddit. */
  subreddits: string[];
  sources: Record<ListenSource, boolean>;
  /** Short quotes the founder marked "Not relevant": the check learns from them. */
  rejected?: string[];
}

export interface Notice {
  id: string;
  icpId: string;
  categoryId: string;
  source: ListenSource;
  url: string;
  /** Who wrote it: a name or a handle, as shown on the site. */
  author: string;
  company?: string;
  /** Their own words, copied from the post. */
  quote: string;
  /** When they posted (ISO date), when known. */
  postedAt?: string;
  /** Why it matched, in one plain sentence. */
  why: string;
  foundAt: string;
  status: "new" | "seen" | "saved" | "dismissed";
}

/** A post read from a source, before the check. */
export interface RawPost {
  source: ListenSource;
  url: string;
  author: string;
  text: string;
  postedAt?: string;
  where?: string;
}

/** Most posts a morning shows: more is noise. */
export const MAX_NOTICES_A_DAY = 10;

const words = (s: string): string[] => s.toLowerCase().match(/[a-z0-9$']+/g) ?? [];

/** How many of a category's keywords (or all words of a phrase) a post contains. */
export const keywordHits = (text: string, keywords: string[]): number => {
  const t = ` ${words(text).join(" ")} `;
  return keywords.filter((k) => {
    const w = words(k);
    return w.length > 0 && (t.includes(` ${w.join(" ")} `) || w.every((x) => t.includes(` ${x} `)));
  }).length;
};

/** Posts worth an AI check: they hit a keyword, are not seen before, newest first, capped. */
export const shortlist = (
  posts: RawPost[],
  categories: ListenCategory[],
  seenUrls: Set<string>,
  cap = 25
): RawPost[] => {
  const on = categories.filter((c) => c.on);
  const unique = new Map<string, RawPost>();
  for (const p of posts)
    if (p.url && !seenUrls.has(p.url) && !unique.has(p.url)) unique.set(p.url, p);
  return [...unique.values()]
    .map((p) => ({ p, hits: Math.max(0, ...on.map((c) => keywordHits(p.text, c.keywords))) }))
    .filter((x) => x.hits > 0)
    .sort(
      (a, b) => b.hits - a.hits || Date.parse(b.p.postedAt ?? "0") - Date.parse(a.p.postedAt ?? "0")
    )
    .slice(0, cap)
    .map((x) => x.p);
};

/** True when the morning run is due: past the set time today and not run today yet. */
export const listenDue = (time: string, lastRun: string | undefined, now = new Date()): boolean => {
  const [h, m] = time.split(":").map(Number);
  const at = new Date(now);
  at.setHours(h ?? 8, m ?? 30, 0, 0);
  if (now < at) return false;
  return !lastRun || new Date(lastRun) < at;
};

/** The social sites IcpFinder reads, and their home pages. */
export const SITES = {
  reddit: "www.reddit.com",
  x: "x.com",
  linkedin: "www.linkedin.com",
} as const;
export type Site = keyof typeof SITES;

/** ok = can read; ask = the browser extension needs the founder's OK; blocked = a browser policy
 *  forbids it; signed-out = IcpFinder's browser is not signed in; unknown = not checked yet. */
export type SiteStatus = "ok" | "ask" | "blocked" | "unsupported" | "signed-out" | "unknown";

export interface BrowserStatus {
  mode: "yours" | "app";
  checkedAt: string;
  /** Your browser only: Claude in Chrome answered. */
  connected: boolean;
  /** Your browser only: the extension asks the founder to allow IcpFinder's connection first. */
  needsConnect?: boolean;
  sites: Record<Site, SiteStatus>;
}

/** What a browser tool error means for one site. */
export const siteStatusOf = (text: string): SiteStatus =>
  /not allowed due to safety/i.test(text)
    ? "unsupported"
    : /restricted by policy/i.test(text)
      ? "blocked"
      : /requires permission|permission required|not allowed/i.test(text)
        ? "ask"
        : /\b(log ?in|sign ?in)\b/i.test(text) && text.length < 200
          ? "signed-out"
          : "ok";
