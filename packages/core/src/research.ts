// SPDX-License-Identifier: MIT
//
// Account research — the SDR workflow for ONE target company.
//
//   1. Gather   — three focused, web-grounded LLM passes (why-now, people +
//                 LinkedIn, website + need). Every claim must carry source
//                 URLs and a VERBATIM quote from each page. "Unknown" is a
//                 valid answer; guessing is not.
//   2. Verify   — code, not the model: fetch every cited page (SSRF-safe),
//                 strip it to text, and check the quote really is on it.
//   3. Score    — a finding is "proven" only with >= 2 verified quotes from
//                 >= 2 different hosts (for what they sell / need / use:
//                 >= 2 different pages, since their own site is the authority). Why-now findings must also be dated
//                 inside the window, and the date must appear on a verified
//                 page. One verified source = "weak". None = "rejected".
//   4. Write    — a no-tools LLM pass drafts fit + opener from proven
//                 findings ONLY; each line must cite proven finding ids or
//                 it is dropped.
//
// The model proposes, the code disposes: nothing reaches `proven` on the
// model's word alone.

import type { LlmProvider } from "@icpfinder/providers";
import { safeFetch } from "./safe-fetch";

export type FindingKind =
  | "why_now"
  | "person"
  | "linkedin_post"
  | "what_they_sell"
  | "their_need"
  | "tech_stack"
  | "disqualifier";

export type FindingStatus = "proven" | "weak" | "rejected";

export type EvidenceCheck =
  | "verified"
  | "quote_not_found"
  | "fetch_failed"
  | "login_wall"
  | "no_quote";

export interface Evidence {
  url: string;
  quote: string;
  check: EvidenceCheck;
}

export interface Finding {
  /** Stable id, e.g. `why_now_0`. Used by the write step to cite. */
  id: string;
  kind: FindingKind;
  claim: string;
  /** ISO date (YYYY-MM-DD) of the event, when the claim is an event. */
  date?: string;
  /** Person-only: name + role + profile URL as the model found them. */
  person?: { name: string; role: string; profileUrl?: string };
  evidence: Evidence[];
  status: FindingStatus;
  /** Why the finding is not proven (empty when proven). */
  why?: string;
}

export interface OutreachLine {
  text: string;
  citations: string[];
}

export interface AccountResearch {
  company: { name: string; domain: string };
  researchedAt: string;
  windowDays: number;
  findings: Finding[];
  /** 0-100, from the write step; null when nothing was proven. */
  fitScore: number | null;
  fitSummary: OutreachLine[];
  opener: OutreachLine[];
  /** Questions a human SDR still needs to answer by hand. */
  gaps: string[];
}

export interface SellerContext {
  /** What the seller sells and the pain it removes, in plain words. */
  summary: string;
  url?: string;
}

export type PageFetcher = (url: string) => Promise<string>;

export interface ResearchAccountInput {
  llm: LlmProvider;
  seller: SellerContext;
  company: { name: string; domain: string };
  contact?: { name?: string; role?: string };
  /** Why-now events older than this are not "now". Default 120. */
  windowDays?: number;
  /** Override page fetch (tests). Default: safeFetch + HTML-to-text. */
  fetchPage?: PageFetcher;
  /** Override clock (tests). */
  now?: Date;
  /** Per LLM pass. Web research is slow; default 300 s. */
  timeoutMs?: number;
}

const DEFAULT_WINDOW_DAYS = 120;
const DEFAULT_TIMEOUT_MS = 300_000;
const MIN_QUOTE_CHARS = 12;
/** Facts the company states about itself; other kinds need 2 different hosts. */
const SELF_DESCRIBED: FindingKind[] = ["what_they_sell", "their_need", "tech_stack"];
const LOGIN_WALL_HOSTS = ["linkedin.com", "x.com", "twitter.com", "facebook.com", "instagram.com"];

// ---------------------------------------------------------------------------
// Text helpers (exported for tests)
// ---------------------------------------------------------------------------

/** HTML → collapsed visible text. Good enough for substring checks. */
export const htmlToText = (html: string): string =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;|&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

/** Lowercase, unify quotes/dashes, drop punctuation runs, collapse space. */
export const normalizeForMatch = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[–—−]/g, "-")
    .replace(/[^\p{L}\p{N}'"$%.-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

export const quoteAppearsIn = (quote: string, pageText: string): boolean => {
  const q = normalizeForMatch(quote);
  if (q.length < MIN_QUOTE_CHARS) return false;
  return normalizeForMatch(pageText).includes(q);
};

export const hostOf = (url: string): string | null => {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
};

const isLoginWall = (host: string): boolean =>
  LOGIN_WALL_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

/** True when the ISO date shows up on the page in a common written form. */
export const dateAppearsIn = (iso: string, pageText: string): boolean => {
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(iso);
  if (!m) return false;
  const [, y, mo, d] = m as unknown as [string, string, string, string | undefined];
  const month = MONTHS[Number(mo) - 1];
  if (!month) return false;
  const text = pageText.toLowerCase();
  const short = month.slice(0, 3);
  const forms = [`${y}-${mo}`, `${month} ${y}`, `${short} ${y}`];
  if (d) {
    const day = String(Number(d));
    forms.push(
      `${month} ${day}, ${y}`,
      `${short} ${day}, ${y}`,
      `${day} ${month} ${y}`,
      `${day} ${short} ${y}`,
      `${mo}/${d}/${y}`
    );
  }
  return forms.some((f) => text.includes(f));
};

// ---------------------------------------------------------------------------
// Step 1 — gather
// ---------------------------------------------------------------------------

const EVIDENCE_RULES = `Rules (strict):
- Use web search and open the pages. Do NOT answer from memory.
- Every finding needs at least 2 sources from 2 DIFFERENT websites when
  possible. One source is allowed but will be marked weak.
- "quote" must be copied VERBATIM from the page text (12-200 characters).
  No paraphrase, no ellipses, no merged sentences. If you cannot copy an
  exact sentence from the page, do not cite that page.
- Prefer pages that load without login (company site, blog, changelog,
  careers page, press, news, Crunchbase news, GitHub, podcasts). LinkedIn
  and X pages count only as extra sources.
- If you find nothing, return an empty array. Never invent people, dates,
  numbers, URLs or quotes.

Output strict JSON only, no prose, no fences:
{"findings":[{"kind":"...","claim":"one sentence","date":"YYYY-MM-DD or omit",
"person":{"name":"","role":"","profileUrl":""} (person/linkedin_post only),
"evidence":[{"url":"https://...","quote":"verbatim text"}]}]}`;

interface GatherPass {
  kinds: FindingKind[];
  prompt: (company: string, domain: string, ctx: string) => string;
}

const GATHER_PASSES: GatherPass[] = [
  {
    kinds: ["why_now", "disqualifier"],
    prompt: (company, domain, ctx) =>
      `Research ${company} (${domain}) like an SDR looking for WHY NOW.
Find dated events from the last ${ctx}: funding, launches, pricing changes,
hiring (open roles), leadership changes, expansion, layoffs, migrations,
public complaints about a problem. kind = "why_now".
Also find disqualifiers (acquired, shut down, already uses a direct
competitor of the seller, wrong size). kind = "disqualifier".`,
  },
  {
    kinds: ["person", "linkedin_post"],
    prompt: (company, domain, ctx) =>
      `Research the people at ${company} (${domain}) like an SDR.
${ctx}
Find the best person to contact: founder or the owner of the problem.
kind = "person" with person.name, person.role, person.profileUrl. Proof =
company team/about page, press, podcast, or the person's own site.
Then find that person's recent public posts or talks (LinkedIn, X, blog,
podcast) that mention a relevant problem. kind = "linkedin_post", with the
post date in "date".`,
  },
  {
    kinds: ["what_they_sell", "their_need", "tech_stack"],
    prompt: (company, domain, ctx) =>
      `Research ${company} (${domain}) like an SDR comparing what they sell to
what they need.
${ctx}
1. kind = "what_they_sell": the problem their product solves for THEIR
   customers, quoted from their own website.
2. kind = "their_need": evidence THEY have the problem the seller solves
   (job ads, roadmap, blog posts, changelog, founder posts, reviews).
3. kind = "tech_stack": tools they publicly use that matter to the seller.`,
  },
];

interface RawFinding {
  kind?: unknown;
  claim?: unknown;
  date?: unknown;
  person?: unknown;
  evidence?: unknown;
}

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

const extractJson = (raw: string): string => {
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fence?.[1]) return fence[1];
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  return start >= 0 && end > start ? raw.slice(start, end + 1) : raw;
};

export const parseFindings = (raw: string, allowed: FindingKind[]): RawFinding[] => {
  try {
    const parsed = JSON.parse(extractJson(raw)) as { findings?: unknown };
    if (!Array.isArray(parsed.findings)) return [];
    return (parsed.findings as RawFinding[]).filter(
      (f) =>
        f &&
        typeof f === "object" &&
        allowed.includes(str(f.kind) as FindingKind) &&
        str(f.claim).length > 0
    );
  } catch {
    return [];
  }
};

// ---------------------------------------------------------------------------
// Step 2 — verify
// ---------------------------------------------------------------------------

const defaultFetchPage: PageFetcher = async (url) => {
  const res = await safeFetch(url, { timeoutMs: 10_000, maxRedirects: 5, maxBytes: 8_000_000 });
  if (res.status >= 400) throw new Error(`HTTP ${res.status}`);
  return res.contentType === "text/html" ? htmlToText(res.body) : res.body;
};

interface CheckedPage {
  text: string | null;
  check: EvidenceCheck;
}

const checkEvidence = async (
  rawEvidence: unknown,
  fetchPage: PageFetcher,
  pageCache: Map<string, Promise<string | null>>
): Promise<Array<Evidence & { pageText: string | null }>> => {
  if (!Array.isArray(rawEvidence)) return [];
  const out: Array<Evidence & { pageText: string | null }> = [];
  for (const e of rawEvidence as Array<{ url?: unknown; quote?: unknown }>) {
    const url = str(e?.url);
    const quote = str(e?.quote);
    const host = hostOf(url);
    if (!host || !url.startsWith("https://")) continue;
    if (!quote) {
      out.push({ url, quote, check: "no_quote", pageText: null });
      continue;
    }
    let cached = pageCache.get(url);
    if (!cached) {
      cached = fetchPage(url).catch(() => null);
      pageCache.set(url, cached);
    }
    const page: CheckedPage = { text: await cached, check: "verified" };
    if (page.text === null) {
      page.check = isLoginWall(host) ? "login_wall" : "fetch_failed";
    } else if (!quoteAppearsIn(quote, page.text)) {
      page.check = isLoginWall(host) ? "login_wall" : "quote_not_found";
    }
    out.push({ url, quote, check: page.check, pageText: page.text });
  }
  return out;
};

// ---------------------------------------------------------------------------
// Step 3 — score
// ---------------------------------------------------------------------------

export const scoreFinding = (
  kind: FindingKind,
  date: string | undefined,
  evidence: Array<Evidence & { pageText: string | null }>,
  now: Date,
  windowDays: number
): { status: FindingStatus; why?: string } => {
  const verified = evidence.filter((e) => e.check === "verified");
  const hosts = new Set(verified.map((e) => hostOf(e.url)));
  if (verified.length === 0) return { status: "rejected", why: "no quote found on any cited page" };

  if (kind === "why_now" || kind === "linkedin_post") {
    if (!date) return { status: "weak", why: "event has no date" };
    const t = Date.parse(date);
    if (Number.isNaN(t)) return { status: "weak", why: "event date unreadable" };
    const ageDays = (now.getTime() - t) / 86_400_000;
    if (ageDays > windowDays) return { status: "rejected", why: `older than ${windowDays} days` };
    if (ageDays < -2) return { status: "rejected", why: "date is in the future" };
    if (!verified.some((e) => e.pageText && dateAppearsIn(date, e.pageText))) {
      return { status: "weak", why: "date not shown on a verified page" };
    }
  }
  if (SELF_DESCRIBED.includes(kind)) {
    // The company's own pages are the authority here: 2 different pages suffice.
    const pages = new Set(verified.map((e) => e.url.split("#")[0]));
    if (pages.size < 2) return { status: "weak", why: "only one page backs this" };
    return { status: "proven" };
  }
  if (hosts.size < 2) return { status: "weak", why: "only one independent source" };
  return { status: "proven" };
};

// ---------------------------------------------------------------------------
// Step 4 — write (proven findings only)
// ---------------------------------------------------------------------------

const WRITE_SYSTEM = `You are an SDR writing from PROVEN facts only.
You get a seller summary and a list of proven findings with ids. Use no
other knowledge. Every line you write must cite the finding ids it rests
on. If the facts are thin, write less. Output strict JSON only:
{"fitScore":0-100,"fit":[{"text":"","citations":["id"]}],
"opener":[{"text":"","citations":["id"]}],"gaps":["question a human must still check"]}
fit = 2-4 lines: their problem vs what the seller solves.
opener = 2-3 sentence cold-email opener in plain words, no flattery.`;

const keepCited = (v: unknown, proven: Set<string>): OutreachLine[] => {
  if (!Array.isArray(v)) return [];
  return (v as Array<{ text?: unknown; citations?: unknown }>)
    .map((l) => ({
      text: str(l?.text),
      citations: Array.isArray(l?.citations) ? l.citations.map(str).filter(Boolean) : [],
    }))
    .filter((l) => l.text && l.citations.length > 0 && l.citations.every((c) => proven.has(c)));
};

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export const researchAccount = async (input: ResearchAccountInput): Promise<AccountResearch> => {
  const now = input.now ?? new Date();
  const windowDays = input.windowDays ?? DEFAULT_WINDOW_DAYS;
  const fetchPage = input.fetchPage ?? defaultFetchPage;
  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const { name, domain } = input.company;
  const contactCtx = input.contact?.name
    ? `Known contact: ${input.contact.name}${input.contact.role ? ` (${input.contact.role})` : ""}. Check this person first.`
    : "";
  const sellerCtx = `The seller: ${input.seller.summary}${input.seller.url ? ` (${input.seller.url})` : ""}.`;

  const raws = await Promise.all(
    GATHER_PASSES.map(async (pass) => {
      const ctx =
        pass.kinds[0] === "why_now"
          ? `${windowDays} days (today is ${now.toISOString().slice(0, 10)}). ${sellerCtx}`
          : `${sellerCtx} ${contactCtx}`;
      try {
        const res = await input.llm.generate({
          system: EVIDENCE_RULES,
          prompt: pass.prompt(name, domain, ctx),
          grounding: true,
          format: "json",
          timeoutMs,
        });
        return parseFindings(res.text, pass.kinds);
      } catch {
        return [];
      }
    })
  );

  const pageCache = new Map<string, Promise<string | null>>();
  const counters = new Map<FindingKind, number>();
  const findings: Finding[] = [];
  for (const raw of raws.flat()) {
    const kind = str(raw.kind) as FindingKind;
    const n = counters.get(kind) ?? 0;
    counters.set(kind, n + 1);
    const date = str(raw.date) || undefined;
    const evidence = await checkEvidence(raw.evidence, fetchPage, pageCache);
    const { status, why } = scoreFinding(kind, date, evidence, now, windowDays);
    const p = raw.person as { name?: unknown; role?: unknown; profileUrl?: unknown } | undefined;
    const person =
      p && str(p.name)
        ? {
            name: str(p.name),
            role: str(p.role),
            ...(str(p.profileUrl) ? { profileUrl: str(p.profileUrl) } : {}),
          }
        : undefined;
    findings.push({
      id: `${kind}_${n}`,
      kind,
      claim: str(raw.claim),
      ...(date ? { date } : {}),
      ...(person ? { person } : {}),
      evidence: evidence.map(({ url, quote, check }) => ({ url, quote, check })),
      status,
      ...(why ? { why } : {}),
    });
  }

  const proven = findings.filter((f) => f.status === "proven");
  const provenIds = new Set(proven.map((f) => f.id));
  let fitScore: number | null = null;
  let fitSummary: OutreachLine[] = [];
  let opener: OutreachLine[] = [];
  let gaps: string[] = [];
  if (proven.length > 0) {
    try {
      const res = await input.llm.generate({
        system: WRITE_SYSTEM,
        prompt: JSON.stringify({
          seller: input.seller,
          company: input.company,
          findings: proven.map(({ id, kind, claim, date, person }) => ({
            id,
            kind,
            claim,
            date,
            person,
          })),
        }),
        format: "json",
        timeoutMs,
      });
      const w = JSON.parse(extractJson(res.text)) as Record<string, unknown>;
      const score = Number(w.fitScore);
      fitScore = Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : null;
      fitSummary = keepCited(w.fit, provenIds);
      opener = keepCited(w.opener, provenIds);
      gaps = Array.isArray(w.gaps) ? w.gaps.map(str).filter(Boolean) : [];
    } catch {
      // Write step is optional; proven findings still stand.
    }
  }
  if (!proven.some((f) => f.kind === "why_now")) gaps.unshift("No proven why-now event.");
  if (!proven.some((f) => f.kind === "person")) gaps.unshift("No proven contact person.");

  return {
    company: { name, domain },
    researchedAt: now.toISOString(),
    windowDays,
    findings,
    fitScore,
    fitSummary,
    opener,
    gaps,
  };
};
