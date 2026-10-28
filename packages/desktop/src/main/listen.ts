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
import { createLlm, yourBrowserPages } from "./engine";

const json = <T>(text: string): T => {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  try {
    return JSON.parse(fence?.[1] ?? text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) as T;
  } catch {
    // An empty or cut-off AI answer: plain words for the founder, not a parser message.
    throw new Error(
      "The AI answer came back incomplete. It runs again tomorrow, or press Check now."
    );
  }
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

/** Search pages for Reddit, X and LinkedIn, read in the founder's own browser where they are signed in. */
const pageUrl = (source: "reddit" | "x" | "linkedin", q: string, subs: string[]): string => {
  const e = encodeURIComponent(q);
  if (source === "reddit")
    return subs.length
      ? `https://www.reddit.com/r/${subs.join("+")}/search/?q=${e}&restrict_sr=1&sort=new&t=week`
      : `https://www.reddit.com/search/?q=${e}&type=posts&sort=new&t=week`;
  if (source === "x") return `https://x.com/search?q=${e}&f=live`;
  return `https://www.linkedin.com/search/results/content/?keywords=${e}&sortBy=%22date_posted%22`;
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
  model?: string,
  allowLinkedIn = false,
  report: (step: string) => void = () => {}
): Promise<ListenRun> => {
  const l = icp.listen;
  if (!l?.on) return { notices: [], problems: [] };
  const cats = l.categories.filter((c) => c.on);
  // Two queries per category at most: the first keywords are the ones people write most.
  const queries = [...new Set(cats.flatMap((c) => c.keywords.slice(0, 2)))].slice(0, 6);
  const posts: RawPost[] = [];
  const pages: Array<{ source: "reddit" | "x" | "linkedin"; text: string }> = [];
  const problems: string[] = [];
  for (const q of queries) if (l.sources.hn) posts.push(...(await readHn(q, days).catch(() => [])));
  // Reddit, X and LinkedIn: read in the founder's own browser (Claude in Chrome), one batch, read only.
  // LinkedIn only when the founder switched it on in Settings → Browser (its terms forbid automated reading).
  const social = (["reddit", "x", "linkedin"] as const).filter(
    (s) => l.sources[s] && (s !== "linkedin" || allowLinkedIn)
  );
  if (social.length) {
    {
      const wanted = social.flatMap((source) =>
        queries.slice(0, 2).map((q) => ({ source, url: pageUrl(source, q, l.subreddits) }))
      );
      let blocked = "";
      report(`${icp.name}: reading ${wanted.length} pages in your browser (${social.join(", ")})`);
      const got = await yourBrowserPages(wanted.map((w) => w.url)).catch((e: unknown) => {
        blocked = e instanceof Error ? e.message : "";
        return [];
      });
      if (blocked) problems.push(blocked);
      for (const g of got) {
        const source = wanted.find((w) => w.url === g.url)?.source;
        if (source) pages.push({ source, text: g.text });
      }
      for (const source of blocked ? [] : social)
        if (!pages.some((pg) => pg.source === source))
          problems.push(
            `${source === "x" ? "X" : source === "linkedin" ? "LinkedIn" : "Reddit"}: we couldn't read it in your browser. Check that you are signed in there.`
          );
    }
  }
  const short = shortlist(posts, cats, seenUrls);
  report(
    `${icp.name}: read ${posts.length} Hacker News posts${pages.length ? ` and ${pages.length} pages (${[...new Set(pages.map((p) => p.source))].join(", ")})` : ""}; ${short.length} matched your words`
  );
  if (!short.length && !pages.length) return { notices: [], problems };
  report(`${icp.name}: AI checks ${short.length + pages.length} items for real fits`);

  const res = await (await createLlm(true, undefined, model)).generate({
    system: `You check social posts for ONE customer profile of the SELLER. Keep a post only if its author is clearly this profile's person AND the post shows one of the CATEGORIES right now AND it shows a need the SELLER's offer meets. A post that only asks for general feedback, shares a project, or is about an unrelated problem does not count. Drop anything else: vendors, recruiters, news, competitors of the seller, people selling a similar product, jokes, and posts only loosely related. Use only the text given; never invent a post, a name or a quote. For posts from LIST use their id. For Reddit, X or LinkedIn PAGES (each post starts with "POST" and its link), a post counts only if you copy its author and an exact quote from the page text, and its link if one appears. why = one plain sentence, max 22 words, that says which need they show and how it connects to the seller's offer, in their own context (not a summary of their product). quote = their own words, max 200 characters, copied exactly. Keep at most ${MAX_NOTICES_A_DAY}, best first. Output strict JSON: {"keep":[{"id":"","source":"hn|reddit|x|linkedin","url":"","author":"","company":"","quote":"","category":"","why":""}]}`,
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
    const src =
      k.source === "x" || k.source === "linkedin" || k.source === "reddit" ? k.source : undefined;
    // The quote must be on one of that source's pages, or it is not shown.
    const norm = (t: string) => t.replace(/\s+/g, " ").toLowerCase();
    const page = pages.find(
      (pg) => pg.source === src && norm(pg.text).includes(norm(String(k.quote ?? "")).slice(0, 60))
    );
    if (!src || !page || !k.author) continue;
    const url =
      k.url && /^https:\/\/(x\.com|twitter\.com|www\.linkedin\.com|www\.reddit\.com)\//.test(k.url)
        ? k.url
        : pageUrl(src, String(k.quote).slice(0, 60), []);
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
  report(`${icp.name}: ${notices.length} strong ${notices.length === 1 ? "fit" : "fits"} kept`);
  return { notices, problems };
};
