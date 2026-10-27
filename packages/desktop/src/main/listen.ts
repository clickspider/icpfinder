// SPDX-License-Identifier: MIT
//
// Morning listening for the Noticed feed. Reads Hacker News and Reddit through
// their public JSON (no AI), X and LinkedIn search pages in IcpFinder's own
// browser (read only), sorts by keywords, then one light AI call keeps only
// real fits and says why. The founder's chosen listening model runs it.

import { randomUUID } from "node:crypto";
import { sellerSummary } from "../shared/business-overview";
import {
  type Listen,
  type ListenCategory,
  MAX_NOTICES_A_DAY,
  type Notice,
  type RawPost,
  shortlist,
} from "../shared/listen";
import type { Icp, Product } from "../shared/types";
import { browseText, isWall } from "./browse";
import { createLlm } from "./engine";

const json = <T>(text: string): T => {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  return JSON.parse(fence?.[1] ?? text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) as T;
};
const strings = (v: unknown, max: number): string[] =>
  Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string" && x.trim() !== "").slice(0, max)
    : [];

/** One AI call per profile: what its people say when they need the product, and where they say it. */
export const suggestListen = async (p: Product, icp: Icp, model?: string): Promise<Listen> => {
  const res = await (await createLlm(true, undefined, model)).generate({
    system:
      'You set up social listening for ONE customer profile. From its reasons to reach out, write 2-4 categories of posts worth answering. Every category must be a moment when this person would want the SELLER’s offer right now (for example asking how to find customers, just launched with no users, unhappy with a tool the seller replaces). Never a generic activity that does not show that need (asking for feedback, sharing progress, hiring in general). Each category: name = a plain label a founder understands (max 5 words, e.g. "Launched, no customers yet"); keywords = 3-6 short phrases these people really write in posts (2-4 words each, their words, not marketing words). Also: subreddits = 2-4 real, active subreddits where these people post (names without r/); sources = which of hn, reddit, x, linkedin these people really use. Never invent private facts. Output strict JSON: {"categories":[{"name":"","keywords":[]}],"subreddits":[],"sources":{"hn":true,"reddit":true,"x":true,"linkedin":false}}',
    prompt: `SELLER: ${sellerSummary(p)}\n\nPROFILE: ${icp.name}\nWho to talk to: ${icp.card?.buyer.text ?? ""}\nReason to reach out: ${icp.card?.trigger.text ?? ""}\nWhere they talk (from onboarding): ${(icp.where ?? []).join(", ") || "-"}\nSignals: ${(icp.criteria?.signals ?? icp.signals).join("; ")}\nMay not be a fit if: ${icp.card?.skip.text ?? ""}`,
    format: "json",
    timeoutMs: 120_000,
  });
  const o = json<{
    categories?: Array<{ name?: string; keywords?: unknown }>;
    subreddits?: unknown;
    sources?: Partial<Record<string, boolean>>;
  }>(res.text);
  const categories: ListenCategory[] = (o.categories ?? [])
    .filter((c) => typeof c.name === "string" && c.name.trim())
    .slice(0, 4)
    .map((c) => ({
      id: randomUUID().slice(0, 8),
      name: String(c.name).trim(),
      keywords: strings(c.keywords, 6),
      on: true,
    }))
    .filter((c) => c.keywords.length > 0);
  if (!categories.length) throw new Error("Couldn’t suggest what to listen for. Try again.");
  return {
    on: false,
    categories,
    subreddits: strings(o.subreddits, 4).map((s) => s.replace(/^\/?r\//i, "")),
    sources: {
      hn: o.sources?.hn !== false,
      reddit: o.sources?.reddit !== false,
      x: Boolean(o.sources?.x),
      linkedin: Boolean(o.sources?.linkedin),
    },
  };
};

const iso = (seconds?: number) =>
  typeof seconds === "number" ? new Date(seconds * 1000).toISOString() : undefined;

/** Hacker News stories and comments from the last days, through the public Algolia API. */
const readHn = async (q: string, days: number): Promise<RawPost[]> => {
  const since = Math.floor(Date.now() / 1000) - days * 86_400;
  const r = await fetch(
    `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(q)}&tags=(story,comment)&hitsPerPage=20&numericFilters=created_at_i>${since}`,
    { signal: AbortSignal.timeout(10_000) }
  );
  const d = (await r.json()) as {
    hits?: Array<{
      author?: string;
      title?: string | null;
      story_text?: string | null;
      comment_text?: string | null;
      created_at_i?: number;
      objectID?: string;
    }>;
  };
  return (d.hits ?? []).map((h) => ({
    source: "hn",
    url: `https://news.ycombinator.com/item?id=${h.objectID}`,
    author: h.author ?? "",
    text: `${h.title ?? ""} ${(h.story_text ?? h.comment_text ?? "").replace(/<[^>]+>/g, " ")}`
      .trim()
      .slice(0, 1200),
    postedAt: iso(h.created_at_i),
    where: "Hacker News",
  }));
};

/** Reddit posts from the last days, through the public search JSON. */
const readReddit = async (q: string, subs: string[], days: number): Promise<RawPost[]> => {
  const t = days <= 1 ? "day" : days <= 7 ? "week" : "month";
  const base = subs.length
    ? `https://www.reddit.com/r/${subs.join("+")}/search.json?restrict_sr=1&`
    : "https://www.reddit.com/search.json?";
  const url = `${base}q=${encodeURIComponent(q)}&sort=new&t=${t}&limit=20`;
  let body = "";
  const r = await fetch(url, {
    headers: { "User-Agent": "IcpFinder/1.0 (desktop app; read only)" },
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  if (r?.ok) body = await r.text();
  // Reddit sometimes blocks plain requests; IcpFinder's own browser can still read the JSON.
  else body = await browseText(url, 800).catch(() => "");
  let d: {
    data?: {
      children?: Array<{
        data?: {
          author?: string;
          title?: string;
          selftext?: string;
          permalink?: string;
          created_utc?: number;
          subreddit?: string;
        };
      }>;
    };
  } = {};
  try {
    d = JSON.parse(body);
  } catch {
    return [];
  }
  return (d.data?.children ?? []).map(({ data: p = {} }) => ({
    source: "reddit",
    url: `https://www.reddit.com${p.permalink ?? ""}`,
    author: p.author ? `u/${p.author}` : "",
    text: `${p.title ?? ""} ${p.selftext ?? ""}`.trim().slice(0, 1200),
    postedAt: iso(p.created_utc),
    where: p.subreddit ? `r/${p.subreddit}` : "Reddit",
  }));
};

/** X and LinkedIn search pages, read as text in IcpFinder's browser (where the founder signed in). */
const readPage = async (source: "x" | "linkedin", q: string): Promise<string> => {
  const e = encodeURIComponent(q);
  const url =
    source === "x"
      ? `https://x.com/search?q=${e}&f=live`
      : `https://www.linkedin.com/search/results/content/?keywords=${e}&sortBy=%22date_posted%22`;
  const text = await browseText(url, 3500).catch(() => "");
  return isWall(text) ? "" : text.slice(0, 5000);
};

export interface ListenRun {
  notices: Notice[];
  /** Sources that could not be read, e.g. "X: sign in to X in IcpFinder's browser". */
  problems: string[];
}

/** One profile's morning: read, sort by keywords, then one AI check keeps real fits with a reason. */
export const listenFor = async (
  p: Product,
  icp: Icp,
  seenUrls: Set<string>,
  days: number,
  model?: string
): Promise<ListenRun> => {
  const l = icp.listen;
  if (!l?.on) return { notices: [], problems: [] };
  const cats = l.categories.filter((c) => c.on);
  // Two queries per category at most: the first keywords are the ones people write most.
  const queries = [...new Set(cats.flatMap((c) => c.keywords.slice(0, 2)))].slice(0, 6);
  const posts: RawPost[] = [];
  const pages: Array<{ source: "x" | "linkedin"; text: string }> = [];
  const problems: string[] = [];
  let redditRead = 0;
  for (const q of queries) {
    if (l.sources.hn) posts.push(...(await readHn(q, days).catch(() => [])));
    if (l.sources.reddit) {
      const got = await readReddit(q, l.subreddits, days).catch(() => []);
      redditRead += got.length;
      posts.push(...got);
    }
  }
  // Reddit refuses anonymous reads at times; say so instead of looking empty.
  if (l.sources.reddit && !redditRead)
    problems.push(
      "Reddit: we couldn't read it this morning. Sign in to Reddit in IcpFinder's browser."
    );
  for (const source of ["x", "linkedin"] as const) {
    if (!l.sources[source]) continue;
    let read = 0;
    for (const q of queries.slice(0, 2)) {
      const text = await readPage(source, q);
      if (text) {
        pages.push({ source, text });
        read += 1;
      }
    }
    if (!read)
      problems.push(
        `${source === "x" ? "X" : "LinkedIn"}: sign in once in IcpFinder's browser so we can read it.`
      );
  }
  const short = shortlist(posts, cats, seenUrls);
  if (!short.length && !pages.length) return { notices: [], problems };

  const res = await (await createLlm(true, undefined, model)).generate({
    system: `You check social posts for ONE customer profile of the SELLER. Keep a post only if its author is clearly this profile's person AND the post shows one of the CATEGORIES right now AND it shows a need the SELLER's offer meets. A post that only asks for general feedback, shares a project, or is about an unrelated problem does not count. Drop anything else: vendors, recruiters, news, competitors of the seller, people selling a similar product, jokes, and posts only loosely related. Use only the text given; never invent a post, a name or a quote. For posts from LIST use their id. For X or LinkedIn PAGES, a post counts only if you copy its author and an exact quote from the page text, and its link if one appears. why = one plain sentence, max 22 words, that says which need they show and how it connects to the seller's offer, in their own context (not a summary of their product). quote = their own words, max 200 characters, copied exactly. Keep at most ${MAX_NOTICES_A_DAY}, best first. Output strict JSON: {"keep":[{"id":"","source":"hn|reddit|x|linkedin","url":"","author":"","company":"","quote":"","category":"","why":""}]}`,
    prompt: `SELLER: ${sellerSummary(p)}\n\nPROFILE: ${icp.name}. Who: ${icp.card?.buyer.text ?? ""}. Not a fit if: ${icp.card?.skip.text ?? ""}\nCATEGORIES:\n${cats.map((c) => `- ${c.name}`).join("\n")}${l.rejected?.length ? `\nTHE FOUNDER MARKED THESE NOT RELEVANT (skip posts like them):\n${l.rejected.map((r) => `- ${r}`).join("\n")}` : ""}\n\nLIST:\n${short.map((s, i) => `[${i}] ${s.where ?? s.source} · ${s.author} · ${s.postedAt?.slice(0, 10) ?? "?"}\n${s.text}`).join("\n\n")}${pages.map((pg) => `\n\nPAGE (${pg.source}):\n${pg.text}`).join("")}`,
    format: "json",
    timeoutMs: 180_000,
  });
  const keep =
    json<{
      keep?: Array<{
        id?: string | number;
        source?: string;
        url?: string;
        author?: string;
        company?: string;
        quote?: string;
        category?: string;
        why?: string;
      }>;
    }>(res.text).keep ?? [];
  const now = new Date().toISOString();
  const notices: Notice[] = [];
  for (const k of keep.slice(0, MAX_NOTICES_A_DAY)) {
    const cat = cats.find((c) => c.name.toLowerCase() === String(k.category ?? "").toLowerCase());
    if (!cat || !k.why || !k.quote) continue;
    const listed = k.id !== undefined && k.id !== "" ? short[Number(k.id)] : undefined;
    if (listed) {
      notices.push({
        id: randomUUID(),
        icpId: icp.id,
        categoryId: cat.id,
        source: listed.source,
        url: listed.url,
        author: listed.author,
        company: k.company || undefined,
        quote: String(k.quote).slice(0, 220),
        postedAt: listed.postedAt,
        why: String(k.why),
        foundAt: now,
        status: "new",
      });
      continue;
    }
    // From a page: the quote must really be on that page, or it is not shown.
    const src = k.source === "x" || k.source === "linkedin" ? k.source : undefined;
    const page = pages.find((pg) => pg.source === src);
    const norm = (s: string) => s.replace(/\s+/g, " ").toLowerCase();
    if (!src || !page || !k.author || !norm(page.text).includes(norm(String(k.quote)).slice(0, 60)))
      continue;
    const url =
      k.url && /^https:\/\/(x\.com|twitter\.com|www\.linkedin\.com)\//.test(k.url)
        ? k.url
        : src === "x"
          ? `https://x.com/search?q=${encodeURIComponent(String(k.quote).slice(0, 60))}&f=live`
          : `https://www.linkedin.com/search/results/content/?keywords=${encodeURIComponent(String(k.quote).slice(0, 60))}`;
    if (seenUrls.has(url)) continue;
    notices.push({
      id: randomUUID(),
      icpId: icp.id,
      categoryId: cat.id,
      source: src,
      url,
      author: String(k.author),
      company: k.company || undefined,
      quote: String(k.quote).slice(0, 220),
      why: String(k.why),
      foundAt: now,
      status: "new",
    });
  }
  return { notices, problems };
};
