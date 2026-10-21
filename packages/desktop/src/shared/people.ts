// SPDX-License-Identifier: MIT
//
// Who in the founder's own network fits an ICP, and who works at a company
// the hunt found. Three steps, cheapest first:
//   1. an index built once per import: title word → people, company → people
//      (every lookup after that is a Map hit, O(1));
//   2. the ICP's person profile (roles to include and exclude, company size,
//      industry), written once per ICP by Claude and cached;
//   3. facts about each contact's company (size, industry), filled by Claude
//      only for companies not seen before, and cached for good.
// The final check is plain code: same inputs, same answer.

import type { Contact, Icp } from "./types";

/** One fixed list, so the ICP profile and the company facts compare exactly. */
export const INDUSTRIES = [
  "Developer tools",
  "B2B SaaS",
  "AI",
  "Fintech",
  "E-commerce",
  "Marketplace",
  "Agency",
  "Consulting",
  "Media",
  "Healthcare",
  "Education",
  "HR & recruiting",
  "Investing",
  "Hardware",
  "Gaming",
  "Travel",
  "Enterprise IT",
  "Nonprofit",
  "Other",
];

export interface PersonProfile {
  /** Title phrases that make someone this buyer, e.g. "founder", "head of growth". */
  roles: string[];
  /** Title phrases that rule someone out, e.g. "associate", "investor". */
  exclude: string[];
  /** Company industries that fit; empty = any. */
  industries: string[];
  /** Largest company size that fits (people); 0 = any. */
  maxSize: number;
}

/** What we know about a contact's company. size = rough headcount, 0 = unknown. */
export interface CompanyFacts {
  industry: string;
  size: number;
  /** True once a web search checked this company, so it is never searched again. */
  web?: boolean;
  /** True once its LinkedIn page was read. */
  linkedin?: boolean;
}

export const normCompany = (s: string): string =>
  s
    .toLowerCase()
    .replace(/\b(inc|ltd|llc|gmbh|bv|b\.v\.|corp|co|labs|hq|ai|io)\b\.?/g, "")
    .replace(/[^a-z0-9]/g, "");

export const normTitle = (s: string): string =>
  ` ${s
    .toLowerCase()
    .replace(/co-?founder/g, "founder")
    .replace(/chief executive officer/g, "ceo")
    .replace(/chief technology officer/g, "cto")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\b(\w{4,})s\b/g, "$1")
    .replace(/\s+/g, " ")
    .trim()} `;

export interface NetworkIndex {
  byCompany: Map<string, number[]>;
  /** Every single title word and every two-word phrase → people with it. */
  byWord: Map<string, number[]>;
  titles: string[];
}

const cache = new WeakMap<Contact[], NetworkIndex>();

/** Build once per contacts list (O(n)); every lookup afterwards is O(1). */
export const indexOf = (contacts: Contact[]): NetworkIndex => {
  const hit = cache.get(contacts);
  if (hit) return hit;
  const byCompany = new Map<string, number[]>();
  const byWord = new Map<string, number[]>();
  const titles: string[] = [];
  const add = (m: Map<string, number[]>, k: string, i: number) => {
    const l = m.get(k);
    if (l) l.push(i);
    else m.set(k, [i]);
  };
  contacts.forEach((c, i) => {
    const k = normCompany(c.company);
    if (k.length > 1) add(byCompany, k, i);
    const t = normTitle(c.position);
    titles.push(t);
    const w = t.trim().split(" ");
    for (let j = 0; j < w.length; j++) {
      add(byWord, w[j] ?? "", i);
      if (j + 1 < w.length) add(byWord, `${w[j]} ${w[j + 1]}`, i);
    }
  });
  const idx = { byCompany, byWord, titles };
  cache.set(contacts, idx);
  return idx;
};

/** People at a company the hunt found: by name or by the domain's first label. O(1). */
export const peopleAt = (
  contacts: Contact[],
  company: { name: string; domain: string }
): Contact[] => {
  const idx = indexOf(contacts);
  const keys = new Set([
    normCompany(company.name),
    normCompany(company.domain.split(".")[0] ?? ""),
  ]);
  const out: Contact[] = [];
  for (const k of keys)
    for (const i of idx.byCompany.get(k) ?? []) {
      const c = contacts[i];
      if (c) out.push(c);
    }
  return out;
};

const CORE = ["founder", "ceo", "cto", "coo", "cmo", "cpo", "owner", "partner", "president"];

/** Fallback when an ICP has no profile yet: roles read from its name. */
export const rolesOf = (icp: Pick<Icp, "name">): string[] => {
  const out = new Set<string>();
  for (const part of icp.name.split(/\s+or\s+|&|\/|,|\band\b/i)) {
    const p = normTitle(part).trim();
    if (p.length < 3) continue;
    out.add(p);
    for (const c of CORE) if (new RegExp(`\\b${c}\\b`).test(p)) out.add(c);
  }
  return [...out];
};

export type Fit = "fits" | "likely" | "maybe";

export interface PersonMatch {
  person: Contact;
  /** fits = title, industry and size checked; likely = title and industry fit, size unknown; maybe = company unknown. */
  fit: Fit;
  why: string;
}

const DEFAULT_EXCLUDE = [
  "associate",
  "assistant",
  "intern",
  "recruiter",
  "talent",
  "investor",
  "advisor",
];

type IcpLike = Pick<Icp, "name"> & { people?: PersonProfile };

/**
 * People in the network who are this ICP. Candidates come from the title
 * index (one Map hit per role phrase), then title exclusions and company
 * facts decide. Unknown company facts never rule a person out: they make it "likely".
 */
export const peopleInIcp = (
  contacts: Contact[],
  icp: IcpLike,
  facts: Record<string, CompanyFacts> = {}
): PersonMatch[] => {
  const idx = indexOf(contacts);
  const p = icp.people;
  const roles = (p?.roles.length ? p.roles : rolesOf(icp)).map((r) => normTitle(r).trim());
  const exclude = [...(p?.exclude ?? []), ...DEFAULT_EXCLUDE].map((r) => normTitle(r).trim());
  const seen = new Set<number>();
  for (const r of roles) {
    if (!r) continue;
    const words = r.split(" ");
    // Look up by the first one or two words, then check the whole phrase.
    const key = words.length > 2 ? `${words[0]} ${words[1]}` : r;
    for (const i of idx.byWord.get(key) ?? []) if (idx.titles[i]?.includes(` ${r} `)) seen.add(i);
  }
  const out: PersonMatch[] = [];
  for (const i of seen) {
    const person = contacts[i];
    const title = idx.titles[i] ?? "";
    if (!person || exclude.some((x) => x && title.includes(` ${x} `))) continue;
    if (!p || (!p.maxSize && !p.industries.length)) {
      out.push({ person, fit: "maybe", why: "Title fits" });
      continue;
    }
    const f = facts[normCompany(person.company)];
    if (!f || (!f.industry && !f.size)) {
      out.push({ person, fit: "maybe", why: "Title fits · company unknown" });
      continue;
    }
    const sizeOk = !p.maxSize || !f.size || f.size <= p.maxSize;
    const industryOk = !p.industries.length || !f.industry || p.industries.includes(f.industry);
    if (!sizeOk || !industryOk) continue;
    const industryKnown = !p.industries.length || Boolean(f.industry);
    const sizeKnown = !p.maxSize || Boolean(f.size);
    out.push({
      person,
      fit: industryKnown && sizeKnown ? "fits" : industryKnown ? "likely" : "maybe",
      why:
        [f.industry, f.size ? `~${f.size} people` : "size unknown"].filter(Boolean).join(" · ") ||
        "Title fits",
    });
  }
  const rank: Record<Fit, number> = { fits: 0, likely: 1, maybe: 2 };
  return out.sort((a, b) => rank[a.fit] - rank[b.fit]);
};

/** Companies of title-matched people that still need facts (for batched Claude calls). */
export const companiesToCheck = (
  contacts: Contact[],
  icp: IcpLike,
  facts: Record<string, CompanyFacts>
): string[] => {
  const loose = icp.people ? { ...icp.people, maxSize: 0, industries: [] } : undefined;
  const names = new Map<string, string>();
  for (const m of peopleInIcp(contacts, { name: icp.name, people: loose })) {
    const k = normCompany(m.person.company);
    if (k && !facts[k] && !names.has(k)) names.set(k, m.person.company);
  }
  return [...names.values()];
};

/** Companies of title-matched people that are still unknown after Claude's own knowledge. */
export const companiesToSearch = (
  contacts: Contact[],
  icp: IcpLike,
  facts: Record<string, CompanyFacts>
): string[] => {
  const names = new Map<string, string>();
  for (const m of peopleInIcp(contacts, icp, facts)) {
    if (m.fit !== "maybe" && m.fit !== "likely") continue;
    const k = normCompany(m.person.company);
    const f = facts[k];
    if (k && f && !f.web && !names.has(k)) names.set(k, m.person.company);
  }
  return [...names.values()];
};

/** Companies still without a size that LinkedIn has not been asked about yet. */
export const companiesForLinkedIn = (
  contacts: Contact[],
  icp: IcpLike,
  facts: Record<string, CompanyFacts>
): string[] => {
  const names = new Map<string, string>();
  for (const m of peopleInIcp(contacts, icp, facts)) {
    if (m.fit === "fits") continue;
    const k = normCompany(m.person.company);
    const f = facts[k];
    if (k && !f?.linkedin && !(f?.size && f.industry) && !names.has(k))
      names.set(k, m.person.company);
  }
  return [...names.values()];
};

/** A real LinkedIn profile or company page, never a search. */
export const LINKEDIN = /^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/(in|company)\/[^\s/?#]+/i;

/**
 * Where "Open on LinkedIn" goes for a found company: the founder's own saved
 * link first, then a profile the research proved. No match = not verified.
 */
export const linkedinFor = (c: {
  linkedin?: string;
  research?: { findings: Array<{ person?: { name: string; profileUrl?: string } }> };
}): { url: string; who?: string } | null => {
  if (c.linkedin && LINKEDIN.test(c.linkedin)) return { url: c.linkedin };
  for (const f of c.research?.findings ?? []) {
    const u = f.person?.profileUrl?.replace(/^http:\/\//, "https://");
    if (u && LINKEDIN.test(u)) return { url: u, who: f.person?.name };
  }
  return null;
};
