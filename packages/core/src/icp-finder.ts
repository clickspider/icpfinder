// SPDX-License-Identifier: MIT
//
// IcpFinder — high-level orchestrator. Composes an LlmProvider +
// EmailProvider into a streaming `find()` generator.
//
// Real candidate flow:
//   1. LLM (with grounding when available) returns archetypes WITH
//      a list of real example companies + domains.
//   2. We enrich each example company via the EmailProvider's
//      searchDomain — gets verified decision-maker contacts.
//   3. If the LLM returned fewer example companies than requested,
//      that archetype yields fewer candidates (no fabrication).
//
// Design notes:
//   - Streaming via async generator. UI subscribes and renders each
//     event as it arrives.
//   - Budget cap enforced AFTER each cost event. Generator yields
//     a final `done` and returns; never throws on cap.
//   - Cancellation honored via input.signal.

import { type EmailProvider, isProviderError, type LlmProvider } from "@icpfinder/providers";
import { generateArchetypes } from "./archetypes";
import type {
  Archetype,
  Candidate,
  FindErrorCode,
  FindErrorProvider,
  FindEvent,
  FindInput,
} from "./types";

function classifyError(err: unknown): {
  code: FindErrorCode;
  provider?: FindErrorProvider;
  message: string;
} {
  if (isProviderError(err)) {
    return { code: err.code, provider: err.provider, message: err.message };
  }
  return {
    code: "unknown",
    message: err instanceof Error ? err.message : String(err),
  };
}

const DEFAULT_ARCHETYPE_LIMIT = 3;
const DEFAULT_CANDIDATES_PER_ARCHETYPE = 5;

export interface IcpFinderOptions {
  llm: LlmProvider;
  email: EmailProvider;
}

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
    const buildCostEvent = (
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
      const classified = classifyError(err);
      yield {
        type: "error",
        message: `Archetype generation failed: ${classified.message}`,
        recoverable: false,
        code: classified.code,
        provider: classified.provider,
      };
      yield { type: "done", totalCostCents };
      return;
    }

    yield buildCostEvent(
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
      yield* this.enrichArchetype(archetype, candidatesPerArchetype, {
        signal,
        budgetCapCents,
        getTotalCost: () => totalCostCents,
        buildCostEvent,
      });
      if (totalCostCents >= budgetCapCents) break;
    }

    yield { type: "done", totalCostCents };
  }

  private async *enrichArchetype(
    archetype: Archetype,
    candidatesPerArchetype: number,
    ctx: {
      signal?: AbortSignal;
      budgetCapCents: number;
      getTotalCost: () => number;
      buildCostEvent: (
        cents: number,
        provider: string,
        endpoint: string,
        units: number
      ) => FindEvent;
    }
  ): AsyncGenerator<FindEvent, void, void> {
    if (archetype.exampleCompanies.length === 0) {
      yield {
        type: "error",
        message: `Archetype "${archetype.role}" had no real example companies; skipping candidate enrichment.`,
        recoverable: true,
      };
      return;
    }

    const companies = archetype.exampleCompanies.slice(0, candidatesPerArchetype);
    for (let i = 0; i < companies.length; i += 1) {
      if (ctx.signal?.aborted) break;
      if (ctx.getTotalCost() >= ctx.budgetCapCents) break;
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
        yield ctx.buildCostEvent(
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
        const classified = classifyError(err);
        yield {
          type: "error",
          message: `Email lookup failed for ${company.domain}: ${classified.message}`,
          recoverable: true,
          code: classified.code,
          provider: classified.provider,
        };
      }

      yield { type: "candidate", candidate };
    }
  }
}
