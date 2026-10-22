import type { Finding, FindingKind } from "@icpfinder/core";
import type { Company } from "./types";

export const RESEARCH_TABS = ["Fit", "Why now", "Background"] as const;
export type ResearchTab = (typeof RESEARCH_TABS)[number];
export const RESEARCH_KINDS: Record<ResearchTab, FindingKind[]> = {
  Fit: ["their_need", "disqualifier"],
  "Why now": ["why_now"],
  Background: ["what_they_sell", "person", "linkedin_post", "tech_stack"],
};

/** Every concern remains visible, even when the short positive selection is limited. */
export function researchConcerns(company: Company): string[] {
  return [
    ...new Set([
      ...(company.dealBreaker ? [company.dealBreaker] : []),
      ...(company.checks ?? [])
        .filter((c) => c.verdict !== "yes")
        .map(
          (c) =>
            `${c.verdict === "no" ? "Not met" : "Unknown"}: ${c.criterion}${c.evidence ? ` — ${c.evidence}` : ""}`
        ),
      ...(company.research?.findings ?? [])
        .filter((f) => f.kind === "disqualifier" && f.status !== "rejected")
        .map((f) => `${f.status === "weak" ? "Needs checking: " : ""}${f.claim}`),
      ...(company.research?.gaps ?? []).slice(0, 1),
    ]),
  ];
}

/** Dated, supported events first; never promote an undated or rejected claim as a recent event. */
export function researchHighlights(findings: Finding[], tab: ResearchTab): Finding[] {
  const candidates = findings.filter(
    (f) =>
      RESEARCH_KINDS[tab].includes(f.kind) && f.status === "proven" && f.kind !== "disqualifier"
  );
  if (tab === "Why now")
    return candidates
      .filter((f) => f.date)
      .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
      .slice(0, 2);
  return candidates.slice(0, 2);
}
