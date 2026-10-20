// SPDX-License-Identifier: MIT

import type { GenerateInput, GenerateResult, LlmProvider } from "@icpfinder/providers";
import { describe, expect, it } from "vitest";
import {
  dateAppearsIn,
  htmlToText,
  quoteAppearsIn,
  researchAccount,
  scoreFinding,
} from "../src/research";

const NOW = new Date("2026-10-19T12:00:00Z");

const PAGES: Record<string, string> = {
  "https://acme-blog.dev/launch":
    "<html><body><h1>Launch</h1><p>October 2, 2026 — We are hiring our first Head of Sales to grow outbound.</p></body></html>",
  "https://news.site/acme":
    "<p>Published 2026-10-03. Acme is hiring a Head of Sales after its seed round.</p>",
  "https://acme.dev/team": "<p>Jane Doe, Founder &amp; CEO, started Acme in 2024.</p>",
  "https://podcast.fm/ep12": "<p>Our guest Jane Doe, founder of Acme, talks outbound.</p>",
};

const fetchPage = async (url: string): Promise<string> => {
  const page = PAGES[url];
  if (!page) throw new Error("404");
  return htmlToText(page);
};

class ScriptedLlm implements LlmProvider {
  readonly name = "scripted";
  readonly stub = false;
  calls: GenerateInput[] = [];
  async generate(input: GenerateInput): Promise<GenerateResult> {
    this.calls.push(input);
    const cost = { units: 0, costCents: 0, provider: "scripted", endpoint: "generate" };
    if (!input.grounding) {
      return {
        text: JSON.stringify({
          fitScore: 80,
          fit: [
            { text: "They are building outbound now.", citations: ["why_now_0"] },
            { text: "Invented line.", citations: ["why_now_9"] },
          ],
          opener: [{ text: "Saw you are hiring a Head of Sales.", citations: ["why_now_0"] }],
          gaps: ["Budget owner?"],
        }),
        cost,
        stub: false,
      };
    }
    const p = input.prompt;
    const findings = p.includes("WHY NOW")
      ? [
          {
            kind: "why_now",
            claim: "Acme is hiring its first Head of Sales.",
            date: "2026-10-02",
            evidence: [
              { url: "https://acme-blog.dev/launch", quote: "hiring our first Head of Sales" },
              { url: "https://news.site/acme", quote: "Acme is hiring a Head of Sales" },
            ],
          },
          {
            kind: "why_now",
            claim: "Acme raised a Series B.",
            date: "2026-09-01",
            evidence: [{ url: "https://news.site/acme", quote: "Acme raised a 50M Series B" }],
          },
          {
            kind: "why_now",
            claim: "Old news.",
            date: "2025-01-01",
            evidence: [
              { url: "https://acme-blog.dev/launch", quote: "hiring our first Head of Sales" },
              { url: "https://news.site/acme", quote: "Acme is hiring a Head of Sales" },
            ],
          },
        ]
      : p.includes("people")
        ? [
            {
              kind: "person",
              claim: "Jane Doe is the founder and CEO.",
              person: { name: "Jane Doe", role: "Founder & CEO" },
              evidence: [
                { url: "https://acme.dev/team", quote: "Jane Doe, Founder & CEO" },
                { url: "https://podcast.fm/ep12", quote: "Jane Doe, founder of Acme" },
                { url: "https://www.linkedin.com/in/janedoe", quote: "Founder at Acme" },
              ],
            },
          ]
        : [];
    return { text: `\`\`\`json\n${JSON.stringify({ findings })}\n\`\`\``, cost, stub: false };
  }
}

describe("text checks", () => {
  it("matches quotes across HTML entities, case and curly quotes", () => {
    const text = htmlToText("<p>We&#39;re   HIRING a <b>Head</b> of Sales</p>");
    expect(quoteAppearsIn("we’re hiring a head of sales", text)).toBe(true);
    expect(quoteAppearsIn("we are hiring a head of sales", text)).toBe(false);
    expect(quoteAppearsIn("hiring", text)).toBe(false); // too short to prove anything
  });

  it("finds ISO dates in written forms", () => {
    expect(dateAppearsIn("2026-10-02", "posted october 2, 2026")).toBe(true);
    expect(dateAppearsIn("2026-10-02", "posted 2 Oct 2026")).toBe(true);
    expect(dateAppearsIn("2026-10-02", "posted in 2026")).toBe(false);
  });
});

describe("researchAccount", () => {
  it("only proves what two independent verified pages support", async () => {
    const llm = new ScriptedLlm();
    const r = await researchAccount({
      llm,
      seller: { summary: "outbound tool" },
      company: { name: "Acme", domain: "acme.dev" },
      fetchPage,
      now: NOW,
    });
    const byClaim = Object.fromEntries(r.findings.map((f) => [f.claim, f]));

    expect(byClaim["Acme is hiring its first Head of Sales."]?.status).toBe("proven");
    expect(byClaim["Acme raised a Series B."]?.status).toBe("rejected"); // quote not on page
    expect(byClaim["Old news."]?.status).toBe("rejected"); // outside window

    const jane = byClaim["Jane Doe is the founder and CEO."];
    expect(jane?.status).toBe("proven");
    expect(jane?.evidence.map((e) => e.check)).toEqual(["verified", "verified", "login_wall"]);

    // Write step: lines citing unproven ids are dropped.
    expect(r.fitSummary.map((l) => l.text)).toEqual(["They are building outbound now."]);
    expect(r.opener).toHaveLength(1);
    expect(r.fitScore).toBe(80);
    expect(llm.calls.filter((c) => c.grounding)).toHaveLength(3);
  });

  it("self-described facts need 2 pages; one page stays weak", async () => {
    const ev = (url: string) => ({ url, quote: "x", check: "verified" as const, pageText: "" });
    expect(
      scoreFinding(
        "what_they_sell",
        undefined,
        [ev("https://a.dev/1"), ev("https://a.dev/2")],
        NOW,
        120
      ).status
    ).toBe("proven");
    expect(
      scoreFinding(
        "what_they_sell",
        undefined,
        [ev("https://a.dev/1"), ev("https://a.dev/1")],
        NOW,
        120
      ).status
    ).toBe("weak");
    expect(
      scoreFinding("person", undefined, [ev("https://a.dev/1"), ev("https://a.dev/2")], NOW, 120)
        .status
    ).toBe("weak");
  });

  it("returns no fit and flags gaps when nothing is proven", async () => {
    const empty: LlmProvider = {
      name: "empty",
      stub: false,
      generate: async () => ({
        text: '{"findings":[]}',
        cost: { units: 0, costCents: 0, provider: "empty", endpoint: "generate" },
        stub: false,
      }),
    };
    const r = await researchAccount({
      llm: empty,
      seller: { summary: "x" },
      company: { name: "Acme", domain: "acme.dev" },
      fetchPage,
      now: NOW,
    });
    expect(r.findings).toEqual([]);
    expect(r.fitScore).toBeNull();
    expect(r.gaps).toEqual(["No proven contact person.", "No proven why-now event."]);
  });
});
