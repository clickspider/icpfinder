// SPDX-License-Identifier: MIT
//
// /api/archetypes — phase 1 of the two-phase flow. Streams archetype + cost
// + error + done events ONLY. No candidate enrichment. The client picks
// which archetype(s) to enrich and hits /api/candidates for those.
//
// SSE shape is the same FindEvent union the SDK already consumes — the only
// difference is the run terminates after the last archetype rather than
// fanning into enrichment.

import { generateArchetypes } from "@icpfinder/core";
import type { FindEvent } from "@icpfinder/core";
import { type NextRequest, NextResponse } from "next/server";
import {
  buildApiContext,
  clampInt,
  debitOperatorCost,
  sseHeaders,
} from "@/lib/api-context";
import { rememberArchetypes } from "@/lib/run-cache";
import { scanUrl } from "@/lib/scan-url";
import { classifySeed } from "@/lib/seed-input";
import { sseStreamFromEvents } from "@/lib/sse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SEED_LENGTH = 8_000;
const FREE_TIER_ARCHETYPE_LIMIT = 3;
const BYOK_DEFAULT_ARCHETYPE_LIMIT = 3;

interface ArchetypesRequestBody {
  seed?: unknown;
  archetypeLimit?: unknown;
  grounding?: unknown;
  geminiApiKey?: unknown;
  hunterApiKey?: unknown;
}

export async function POST(request: NextRequest): Promise<Response> {
  let body: ArchetypesRequestBody;
  try {
    body = (await request.json()) as ArchetypesRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const ctxResult = await buildApiContext(request, body, {
    enforceRateLimit: true,
    enforceMonthlyBudget: true,
  });
  if (!ctxResult.ok) return ctxResult.response;
  const ctx = ctxResult.ctx;
  const { bundle, seed: rawSeed } = ctx;

  // Scan + normalize seed if URL.
  const classified = classifySeed(rawSeed);
  let effectiveSeed = rawSeed;
  if (classified.kind === "url" && classified.url) {
    const scanned = await scanUrl(classified.url);
    if (scanned.seed && scanned.seed.length > 0) effectiveSeed = scanned.seed;
  }
  if (effectiveSeed.length > MAX_SEED_LENGTH) {
    effectiveSeed = effectiveSeed.slice(0, MAX_SEED_LENGTH);
  }

  const archetypeLimit = clampInt(
    body.archetypeLimit,
    1,
    5,
    bundle.operatorPaidSides.length > 0
      ? FREE_TIER_ARCHETYPE_LIMIT
      : BYOK_DEFAULT_ARCHETYPE_LIMIT,
  );

  async function* runPhase1(): AsyncGenerator<FindEvent, void, void> {
    try {
      const result = await generateArchetypes({
        llm: bundle.llm,
        seed: effectiveSeed,
        limit: archetypeLimit,
        grounding: body.grounding === true,
      });
      const costEvent: FindEvent = {
        type: "cost",
        cost: {
          units: result.archetypes.length,
          costCents: result.costCents,
          provider: bundle.llm.name,
          endpoint: "generate",
        },
      };
      yield costEvent;
      debitOperatorCost(ctx, bundle, bundle.llm.name, result.costCents);

      if (result.archetypes.length === 0) {
        yield {
          type: "error",
          message: "LLM returned no parseable archetypes",
          recoverable: true,
        };
        yield { type: "done", totalCostCents: result.costCents };
        return;
      }

      for (const archetype of result.archetypes) {
        yield { type: "archetype", archetype };
        if (request.signal.aborted) break;
      }
      // Persist for phase 2 lookup.
      await rememberArchetypes(rawSeed, result.archetypes);
      yield { type: "done", totalCostCents: result.costCents };
    } catch (err) {
      yield {
        type: "error",
        message:
          err instanceof Error ? `Archetype generation failed: ${err.message}` : String(err),
        recoverable: false,
      };
      yield { type: "done", totalCostCents: 0 };
    }
  }

  return new Response(sseStreamFromEvents(runPhase1()), {
    headers: sseHeaders(bundle.mode, ctx.byokHeader, {
      "x-icpfinder-phase": "archetypes",
    }),
  });
}
