// SPDX-License-Identifier: MIT
//
// "Where to reach them": public places to contact a founder, found by code from
// pages we already have (their site, their post, their public profiles). No AI.

export type ReachKind =
  | "post"
  | "x"
  | "linkedin"
  | "github"
  | "hn"
  | "facebook"
  | "instagram"
  | "youtube"
  | "email";

export interface ReachLink {
  kind: ReachKind;
  url: string;
  /** Where we found it, in plain words, e.g. "their site footer". */
  source: string;
}

/** Order on the card: their own post first, the warmest place to answer. */
export const REACH_ORDER: ReachKind[] = [
  "post",
  "x",
  "linkedin",
  "email",
  "github",
  "hn",
  "facebook",
  "instagram",
  "youtube",
];

const SKIP_PATH =
  /\/(share|sharer|intent|hashtag|search|home|login|signup|explore|i\/|policies|legal|help|about\/?$)/i;

/** What kind of reach link a URL is, or null when it is not one. */
export const classify = (raw: string): ReachKind | null => {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return raw.startsWith("mailto:") ? "email" : null;
  }
  if (u.protocol === "mailto:") return "email";
  const host = u.hostname.replace(/^(www|m|mobile)\./, "");
  const path = u.pathname;
  // A post or thread they wrote: answer there.
  if (host === "news.ycombinator.com")
    return path === "/item" ? "post" : path === "/user" ? "hn" : null;
  if (/^(x|twitter)\.com$/.test(host)) {
    if (/\/status\/\d+/.test(path)) return "post";
    return /^\/[A-Za-z0-9_]{1,15}\/?$/.test(path) && !SKIP_PATH.test(path) ? "x" : null;
  }
  if (host === "linkedin.com") {
    if (/^\/(posts|feed\/update)\//.test(path)) return "post";
    return /^\/(in|company)\/[^/]+\/?$/.test(path) ? "linkedin" : null;
  }
  if (host === "reddit.com" && /\/comments\//.test(path)) return "post";
  if (host === "indiehackers.com" && /^\/post\//.test(path)) return "post";
  if (host === "producthunt.com" && /^\/(posts|products)\//.test(path)) return "post";
  if (host === "github.com")
    return /^\/[A-Za-z0-9-]+\/?$/.test(path) && !SKIP_PATH.test(path) ? "github" : null;
  if (host === "facebook.com")
    return /^\/[A-Za-z0-9.]+\/?$/.test(path) && !SKIP_PATH.test(path) ? "facebook" : null;
  if (host === "instagram.com")
    return /^\/[A-Za-z0-9._]+\/?$/.test(path) && !SKIP_PATH.test(path) ? "instagram" : null;
  if (host === "youtube.com") return /^\/(@|c\/|channel\/)/.test(path) ? "youtube" : null;
  return null;
};

/** Every link in an HTML page (href values), absolute only. */
export const hrefsIn = (html: string): string[] =>
  [...html.matchAll(/href\s*=\s*["']([^"'#\s]+)["']/gi)]
    .map((m) => (m[1] ?? "").replace(/&amp;/g, "&"))
    .filter((h) => /^(https?:|mailto:)/i.test(h));

/** Reach links in an HTML page, with one source label. */
export const reachIn = (html: string, source: string): ReachLink[] =>
  hrefsIn(html).flatMap((url) => {
    const kind = classify(url);
    return kind ? [{ kind, url: kind === "email" ? url.replace(/\?.*$/, "") : url, source }] : [];
  });

/** One link per URL, at most 2 per kind, in card order. */
export const mergeReach = (links: ReachLink[]): ReachLink[] => {
  const seen = new Set<string>();
  const perKind = new Map<ReachKind, number>();
  const key = (u: string) => u.toLowerCase().replace(/\/+$/, "").replace("://www.", "://");
  return links
    .filter((l) => {
      const k = key(l.url);
      const n = perKind.get(l.kind) ?? 0;
      if (seen.has(k) || n >= 2) return false;
      seen.add(k);
      perKind.set(l.kind, n + 1);
      return true;
    })
    .sort((a, b) => REACH_ORDER.indexOf(a.kind) - REACH_ORDER.indexOf(b.kind));
};

/** Search pages for the places we could not find, opened in the founder's browser. */
export const reachSearches = (
  name: string,
  person: string | undefined,
  have: Set<ReachKind>
): Array<{ kind: ReachKind; label: string; url: string }> => {
  const q = encodeURIComponent(person ? `${person} ${name}` : name);
  const out: Array<{ kind: ReachKind; label: string; url: string }> = [];
  if (!have.has("x"))
    out.push({
      kind: "x",
      label: "Search X",
      url: `https://x.com/search?q=${encodeURIComponent(name)}&f=user`,
    });
  if (!have.has("linkedin"))
    out.push({
      kind: "linkedin",
      label: "Search LinkedIn",
      url: `https://www.linkedin.com/search/results/all/?keywords=${q}`,
    });
  if (!have.has("post"))
    out.push({
      kind: "post",
      label: "Search Hacker News",
      url: `https://hn.algolia.com/?q=${encodeURIComponent(name)}`,
    });
  return out;
};
