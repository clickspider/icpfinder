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

const POST_LINK =
  /href="([^"]*?(?:\/status\/\d+|\/comments\/[^"/]+|\/feed\/update\/[^"]+|\/posts\/[^"]+))"/;
// ponytail: LinkedIn search shows no post links, so a post links to its author. A second post by
// the same person counts as seen until LinkedIn exposes post links.
const AUTHOR_LINK = /href="([^"]*\/in\/[^"]+)"/;

const indentOf = (l: string) => l.length - l.trimStart().length;

/** The visible words of tree lines: labels only, nothing inside a button, no images or counters. */
const wordsOf = (lines: string[]): string[] => {
  const out: string[] = [];
  let skipDeeperThan = -1;
  for (const l of lines) {
    const indent = indentOf(l);
    if (skipDeeperThan >= 0 && indent > skipDeeperThan) continue;
    skipDeeperThan = -1;
    if (/^\s*(button|img|image|group|progressbar|heading)\b/.test(l) || /\/analytics"/.test(l)) {
      skipDeeperThan = indent;
      continue;
    }
    const word = /^\s*[\w-]+ "([^"]+)" \[ref_/.exec(l)?.[1];
    if (word) out.push(word);
  }
  return out;
};

/** Posts from a Claude in Chrome read_page tree: each post's link and its visible words. A post is
 *  an article (X, Reddit) or a list item that opens with "Feed post" (LinkedIn). Falls back to
 *  every visible word on the page when it has no posts. */
export const postsFromTree = (tree: string, host: string): string => {
  const lines = tree.split("\n");
  const posts: string[] = [];
  let cur: string[] | null = null;
  let depth = -1;
  const flush = () => {
    if (!cur) return;
    const href =
      cur.map((l) => POST_LINK.exec(l)?.[1]).find(Boolean) ??
      cur.map((l) => AUTHOR_LINK.exec(l)?.[1]).find(Boolean);
    const text = [...new Set(wordsOf(cur))].join("\n");
    if (text.length >= 40)
      posts.push(
        `POST${href ? ` ${href.startsWith("http") ? href : `https://${host}${href}`}` : ""}\n${text.slice(0, 900)}`
      );
    cur = null;
  };
  lines.forEach((l, i) => {
    const indent = indentOf(l);
    if (cur && indent <= depth) flush();
    if (
      !cur &&
      (/^\s*article\b/.test(l) ||
        (/^\s*listitem\b/.test(l) && /heading "Feed post"/.test(lines[i + 1] ?? "")))
    ) {
      cur = [];
      depth = indent;
    } else cur?.push(l);
  });
  flush();
  return (posts.length ? [...new Set(posts)].join("\n\n") : wordsOf(lines).join("\n")).slice(
    0,
    9000
  );
};

/** One browser run's tool results, back to pages: each read_page tree belongs to the page the tab
 *  last went to. A page Claude refused to open keeps its error text. */
export const pagesFromTools = (
  results: string[],
  urls: string[]
): Array<{ url: string; text: string; error?: string }> => {
  const out = new Map<string, { url: string; text: string; error?: string }>();
  let url = "";
  let n = 0;
  for (const r of results)
    for (const chunk of r.split(/\n(?=\[\w[\w:]*\] )/)) {
      const to = /Navigated to (\S+)/.exec(chunk)?.[1];
      if (to) {
        url = urls.includes(to) ? to : (urls[n] ?? to);
        n++;
        continue;
      }
      if (!url) continue;
      if (/not allowed due to safety|restricted by policy|requires permission/i.test(chunk))
        out.set(url, { url, text: "", error: chunk.slice(0, 200) });
      else if (/ \[ref_\d+\]/.test(chunk)) {
        const host = new URL(url).host;
        out.set(url, { url, text: postsFromTree(chunk.replace(/^\[\w+\] /, ""), host) });
      }
    }
  return [...out.values()];
};

/** What IcpFinder lets Claude do in the founder's browser: open the listed sites and read them. */
export const isBrowserReadStep = (tool: string, input: Record<string, unknown>): boolean => {
  const name = tool.replace(/^mcp__claude-in-chrome__/, "");
  if (["tabs_context_mcp", "read_page", "get_page_text", "tabs_close_mcp"].includes(name))
    return true;
  if (name === "computer") return input.action === "wait";
  if (name === "navigate") {
    try {
      const u = new URL(String(input.url));
      return u.protocol === "https:" && (Object.values(SITES) as string[]).includes(u.hostname);
    } catch {
      return false;
    }
  }
  return false;
};
