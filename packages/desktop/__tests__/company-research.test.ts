import type { Finding } from "@icpfinder/core";
import { describe, expect, it } from "vitest";
import {
  RESEARCH_KINDS,
  researchConcerns,
  researchHighlights,
} from "../src/shared/company-research";
import type { Company } from "../src/shared/types";

const finding = (
  id: string,
  kind: Finding["kind"],
  status: Finding["status"] = "proven",
  date?: string
): Finding => ({ id, kind, status, date, claim: id, evidence: [] });
describe("company research presentation", () => {
  it("preserves every original category in exactly one complete-research section", () => {
    const kinds = Object.values(RESEARCH_KINDS).flat();
    expect(kinds).toHaveLength(7);
    expect(new Set(kinds).size).toBe(7);
    expect(kinds).toEqual(
      expect.arrayContaining([
        "why_now",
        "person",
        "their_need",
        "what_they_sell",
        "linkedin_post",
        "tech_stack",
        "disqualifier",
      ])
    );
  });
  it("never presents unsupported or undated events as recent supported highlights", () => {
    const facts = [
      finding("undated", "why_now"),
      finding("failed", "why_now", "rejected", "2026-10-22"),
      finding("older", "why_now", "proven", "2026-10-01"),
      finding("newer", "why_now", "proven", "2026-10-20"),
    ];
    expect(researchHighlights(facts, "Why now").map((f) => f.id)).toEqual(["newer", "older"]);
    expect(facts.map((f) => f.id)).toEqual(["undated", "failed", "older", "newer"]);
  });
  it("does not hide negative criteria or disqualifiers behind the positive highlight budget", () => {
    const c: Company = {
      name: "Example",
      domain: "example.com",
      status: "done",
      dealBreaker: "Competes with us",
      checks: [
        { criterion: "Small team", verdict: "no" },
        { criterion: "Owns billing", verdict: "unknown" },
      ],
      research: {
        company: { name: "Example", domain: "example.com" },
        researchedAt: "2026-10-22",
        windowDays: 30,
        fitScore: 80,
        fitSummary: [],
        opener: [],
        gaps: ["Who buys?"],
        findings: [
          finding("Long contract", "disqualifier"),
          finding("Possibly outsourced", "disqualifier", "weak"),
          finding("False concern", "disqualifier", "rejected"),
        ],
      },
    };
    expect(researchConcerns(c)).toEqual([
      "Competes with us",
      "Not met: Small team",
      "Unknown: Owns billing",
      "Long contract",
      "Needs checking: Possibly outsourced",
      "Who buys?",
    ]);
    expect(researchHighlights(c.research?.findings ?? [], "Fit")).toEqual([]);
  });
});
