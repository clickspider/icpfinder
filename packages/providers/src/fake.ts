// SPDX-License-Identifier: MIT
//
// FakeEmailProvider + FakeLlmProvider — fixture-based providers for
// `bun run demo` mode. Zero keys, deterministic output, runs offline.
//
// Used both by the demo command and by the test suite for predictable
// behavior without mocking the global fetch.

import type {
  CostUnit,
  DomainSearchInput,
  DomainSearchResult,
  EmailProvider,
  FindEmailInput,
  FindEmailResult,
  GenerateInput,
  GenerateResult,
  LlmProvider,
  VerifyEmailInput,
  VerifyEmailResult,
} from "./types";

const buildFakeCost = (provider: string, endpoint: string, units = 0): CostUnit => ({
  units,
  costCents: 0,
  provider,
  endpoint,
});

export class FakeEmailProvider implements EmailProvider {
  readonly name = "fake";
  readonly stub = true;

  findEmail(input: FindEmailInput): Promise<FindEmailResult> {
    const domain = input.domain.toLowerCase();
    const local =
      input.firstName
        .trim()
        .toLowerCase()
        .replace(/[^a-z]/g, "") || "founder";
    return Promise.resolve({
      confidence: "high",
      email: `${local}@${domain}`,
      score: 85,
      status: "[FAKE] valid",
      cost: buildFakeCost("fake", "email_finder"),
      stub: true,
    });
  }

  verifyEmail(input: VerifyEmailInput): Promise<VerifyEmailResult> {
    return Promise.resolve({
      confidence: "high",
      email: input.email,
      score: 85,
      status: "[FAKE] valid",
      cost: buildFakeCost("fake", "email_verifier"),
      stub: true,
    });
  }

  searchDomain(input: DomainSearchInput): Promise<DomainSearchResult> {
    const domain = input.domain.toLowerCase();
    return Promise.resolve({
      contacts: [
        {
          confidence: "high",
          firstName: "Sarah",
          lastName: "Chen",
          position: "Head of Operations",
          score: 92,
          seniority: "executive",
          email: `sarah.chen@${domain}`,
        },
        {
          confidence: "medium",
          firstName: "Marcus",
          lastName: "Reed",
          position: "Founder",
          score: 78,
          seniority: "executive",
          email: `marcus@${domain}`,
        },
      ],
      cost: buildFakeCost("fake", "domain_search"),
      stub: true,
    });
  }
}

/**
 * FakeLlmProvider returns one of a few hard-coded archetype responses
 * keyed off the idea text. Useful for `bun run demo` and for tests that
 * exercise the core algorithm without touching Gemini.
 */
export class FakeLlmProvider implements LlmProvider {
  readonly name = "fake";
  readonly stub = true;

  constructor(private readonly responses?: Map<string, string>) {}

  generate(input: GenerateInput): Promise<GenerateResult> {
    const matched = this.responses?.get(input.prompt);
    const text = matched ?? defaultArchetypesJson;
    return Promise.resolve({
      text,
      cost: buildFakeCost("fake", "generate"),
      stub: true,
    });
  }
}

const defaultArchetypesJson = JSON.stringify(
  [
    {
      industry: "Boutique Brand Identity Studios",
      role: "Principal Designer",
      companySize: "1-5 employees",
      pain: "Losing hours weekly on subjective client feedback that requires manual redrawing rather than creative iteration.",
      buyingSignals: [
        "Recent posts on X complaining about revision creep on fixed-fee projects.",
        "Public Behance updates mentioning AI-augmented workflows.",
        "Active in design-business Discord communities discussing workflow tools.",
      ],
    },
    {
      industry: "SaaS Product Design Agencies",
      role: "Head of Design Operations",
      companySize: "11-50 employees",
      pain: "Margin erosion because senior designers manage micro-revisions during developer handoff instead of strategic work.",
      buyingSignals: [
        "LinkedIn job postings for DesignOps Lead with AI tool procurement scope.",
        "Public discussion on design-leadership podcasts about efficiency-based pricing.",
        "GitHub activity from staff on Figma-to-Code tooling with revision tracking.",
      ],
    },
    {
      industry: "Performance Marketing Agencies",
      role: "Creative Director",
      companySize: "51-200 employees",
      pain: "High junior turnover driven by feedback fatigue from processing hundreds of minor ad creative variations.",
      buyingSignals: [
        "Recent Series B press releases earmarking funds for AI creative transformation.",
        "Production Designer hiring posts requiring AI revision management.",
        "Company blog case studies on reducing creative friction with generative tools.",
      ],
    },
  ],
  null,
  2
);
