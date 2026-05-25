// SPDX-License-Identifier: MIT
//
// IcpFinder — high-level orchestrator. Composes an LlmProvider +
// EmailProvider into a streaming `find()` generator.
//
// Design notes:
//   - Streaming via async generator (yield FindEvent). UI subscribes
//     and renders each event as it arrives. No buffering, no all-or-
//     nothing batches.
//   - Budget cap is enforced AFTER each cost event. Generator yields
//     a final `done` event and returns; never throws on cap.
//   - Cancellation honored via input.signal. Each iteration checks
//     signal.aborted; mid-fetch cancellation is delegated to the
//     provider's per-request AbortController.

import type { EmailProvider, LlmProvider } from "@icpfinder/providers";
import { generateArchetypes } from "./archetypes";
import type { Archetype, Candidate, FindEvent, FindInput } from "./types";

const DEFAULT_ARCHETYPE_LIMIT = 3;
const DEFAULT_CANDIDATES_PER_ARCHETYPE = 5;

export interface IcpFinderOptions {
  llm: LlmProvider;
  email: EmailProvider;
}

const slugifyCompany = (industry: string, role: string, idx: number): string => {
  const base = `${industry}-${role}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base || "co"}-${idx}`;
};

/**
 * Placeholder company synthesis. Real implementation (Day 3) will
 * search the web via grounding or call out to Apollo/Clearbit; for
 * now we generate deterministic stand-ins so the streaming pipeline
 * is testable end-to-end.
 */
const synthesizeCompanies = (
  archetype: Archetype,
  count: number
): Array<{ name: string; domain: string }> =>
  Array.from({ length: count }, (_, i) => {
    const slug = slugifyCompany(archetype.industry, archetype.role, i);
    return { name: `Example ${slug}`, domain: `${slug}.example.com` };
  });

export class IcpFinder {
  private readonly llm: LlmProvider;
  private readonly email: EmailProvider;

  constructor(opts: IcpFinderOptions) {
    this.llm = opts.llm;
    this.email = opts.email;
  }

  async *find(input: FindInput): AsyncGenerator<FindEvent, void, void> {
    if (!input.seed?.trim()) {
      yield { type: "error", message: "seed is required", recoverable: false };
      yield { type: "done", totalCostCents: 0 };
      return;
    }

    const archetypeLimit = input.archetypeLimit ?? DEFAULT_ARCHETYPE_LIMIT;
    const candidatesPerArchetype = input.candidatesPerArchetype ?? DEFAULT_CANDIDATES_PER_ARCHETYPE;
    const budgetCapCents = input.budgetCapCents ?? Number.POSITIVE_INFINITY;
    const signal = input.signal;

    let totalCostCents = 0;
    const yieldCost = (
      cents: number,
      provider: string,
      endpoint: string,
      units: number
    ): FindEvent => {
      totalCostCents += cents;
      return {
        type: "cost",
        cost: { units, costCents: cents, provider, endpoint },
      };
    };

    if (signal?.aborted) {
      yield { type: "done", totalCostCents };
      return;
    }

    let archetypeResult: Awaited<ReturnType<typeof generateArchetypes>>;
    try {
      archetypeResult = await generateArchetypes({
        llm: this.llm,
        seed: input.seed,
        limit: archetypeLimit,
        grounding: input.grounding ?? false,
      });
    } catch (err) {
      yield {
        type: "error",
        message: `Archetype generation failed: ${err instanceof Error ? err.message : String(err)}`,
        recoverable: false,
      };
      yield { type: "done", totalCostCents };
      return;
    }

    yield yieldCost(
      archetypeResult.costCents,
      this.llm.name,
      "generate",
      archetypeResult.archetypes.length
    );

    if (totalCostCents >= budgetCapCents) {
      yield { type: "done", totalCostCents };
      return;
    }

    if (archetypeResult.archetypes.length === 0) {
      yield {
        type: "error",
        message: "LLM returned no parseable archetypes",
        recoverable: true,
      };
      yield { type: "done", totalCostCents };
      return;
    }

    for (const archetype of archetypeResult.archetypes) {
      if (signal?.aborted) break;
      yield { type: "archetype", archetype };

      const companies = synthesizeCompanies(archetype, candidatesPerArchetype);
      for (let i = 0; i < companies.length; i += 1) {
        if (signal?.aborted) break;
        if (totalCostCents >= budgetCapCents) break;
        const company = companies[i];
        if (!company) continue;

        const candidate: Candidate = {
          id: `${archetype.id}_cand_${i}`,
          archetypeId: archetype.id,
          companyName: company.name,
          domain: company.domain,
          contactFirstName: null,
          contactLastName: null,
          contactRole: archetype.role,
          contactEmail: null,
          emailConfidence: null,
          emailScore: null,
        };

        try {
          const search = await this.email.searchDomain({ domain: company.domain });
          yield yieldCost(
            search.cost.costCents,
            this.email.name,
            search.cost.endpoint,
            search.cost.units
          );
          const top = search.contacts[0];
          if (top) {
            candidate.contactFirstName = top.firstName;
            candidate.contactLastName = top.lastName;
            candidate.contactRole = top.position ?? archetype.role;
            candidate.contactEmail = top.email;
            candidate.emailConfidence = top.confidence;
            candidate.emailScore = top.score;
          }
        } catch (err) {
          yield {
            type: "error",
            message: `Email lookup failed for ${company.domain}: ${err instanceof Error ? err.message : String(err)}`,
            recoverable: true,
          };
        }

        yield { type: "candidate", candidate };
      }

      if (totalCostCents >= budgetCapCents) break;
    }

    yield { type: "done", totalCostCents };
  }
}
