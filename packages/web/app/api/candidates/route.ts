// SPDX-License-Identifier: MIT
//
// /api/candidates — phase 2 of the two-phase flow. Body carries the same seed
// the client passed to /api/archetypes plus the archetypeId the user picked.
//
// Stale-archetype recovery (E1): if the archetypes for this seed aren't in
// cache anymore (TTL expired, cold node), we silently regenerate phase 1
// ONCE and look up the archetypeId again. On a second miss we return 410
// with an explicit "session expired" code so the client can re-seed.

import { IcpFinder, generateArchetypes } from "@icpfinder/core";
import type { FindEvent } from "@icpfinder/core";
import { type NextRequest, NextResponse } from "next/server";
import {
  buildApiContext,
  clampInt,
  debitOperatorCost,
  sseHeaders,
} from "@/lib/api-context";
import {
  rememberArchetypes,
  recallArchetypes,
  setCachedCandidates,
} from "@/lib/run-cache";
import { scanUrl } from "@/lib/scan-url";
import { classifySeed } from "@/lib/seed-input";
import { sseStreamFromEvents } from "@/lib/sse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SEED_LENGTH = 8_000;
const BYOK_DEFAULT_CANDIDATES_PER_ARCHETYPE = 5;
const FREE_TIER_CANDIDATES_PER_ARCHETYPE = 3;

interface CandidatesRequestBody {
  seed?: unknown;
  archetypeId?: unknown;
  candidatesPerArchetype?: unknown;
  grounding?: unknown;
  geminiApiKey?: unknown;
  hunterApiKey?: unknown;
}

export async function POST(request: NextRequest): Promise<Response> {
  let body: CandidatesRequestBody;
  try {
    body = (await request.json()) as CandidatesRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const archetypeId = typeof body.archetypeId === "string" ? body.archetypeId.trim() : "";
  if (!archetypeId) {
    return NextResponse.json({ error: "archetypeId is required" }, { status: 400 });
  }

  const ctxResult = await buildApiContext(request, body);
  if (!ctxResult.ok) return ctxResult.response;
  const ctx = ctxResult.ctx;
  const { bundle, seed: rawSeed } = ctx;

  // Resolve effective seed identically to phase 1 so regeneration is stable.
  const classified = classifySeed(rawSeed);
  let effectiveSeed = rawSeed;
  if (classified.kind === "url" && classified.url) {
    const scanned = await scanUrl(classified.url);
    if (scanned.seed && scanned.seed.length > 0) effectiveSeed = scanned.seed;
  }
  if (effectiveSeed.length > MAX_SEED_LENGTH) {
    effectiveSeed = effectiveSeed.slice(0, MAX_SEED_LENGTH);
  }

  // Stale-recovery: silent re-phase-1 on first miss, hard 410 on second.
  let archetypes = await recallArchetypes(rawSeed);
  let archetype = archetypes?.find((a) => a.id === archetypeId);
  let regenerated = false;
  if (!archetype) {
    try {
      const result = await generateArchetypes({
        llm: bundle.llm,
        seed: effectiveSeed,
        limit: 3,
        grounding: body.grounding === true,
      });
      debitOperatorCost(ctx, bundle, bundle.llm.name, result.costCents);
      if (result.archetypes.length > 0) {
        await rememberArchetypes(rawSeed, result.archetypes);
        archetypes = result.archetypes;
        archetype = result.archetypes.find((a) => a.id === archetypeId);
        regenerated = true;
      }
    } catch {
      // fall through to 410 below
    }
  }
  if (!archetype) {
    return NextResponse.json(
      {
        error: "Session expired — please paste your seed again.",
        code: "stale_archetype",
      },
      { status: 410 },
    );
  }

  const candidatesPerArchetype = clampInt(
    body.candidatesPerArchetype,
    1,
    10,
    bundle.operatorPaidSides.length > 0
      ? FREE_TIER_CANDIDATES_PER_ARCHETYPE
      : BYOK_DEFAULT_CANDIDATES_PER_ARCHETYPE,
  );

  const finder = new IcpFinder({ llm: bundle.llm, email: bundle.email });

  const targetArchetype = archetype;
  async function* runPhase2(): AsyncGenerator<FindEvent, void, void> {
    let totalCostCents = 0;
    const candidatesCollected: Array<FindEvent & { type: "candidate" }> = [];
    if (regenerated) {
      // Tell client the cache was refreshed transparently.
      yield {
        type: "error",
        message: "Refreshed archetypes from a cold cache.",
        recoverable: true,
        code: "unknown",
      };
    }
    try {
      for await (const event of finder.enrichOne(targetArchetype, {
        candidatesPerArchetype,
        signal: request.signal,
      })) {
        if (event.type === "cost") {
          totalCostCents += event.cost.costCents;
          debitOperatorCost(ctx, bundle, event.cost.provider, event.cost.costCents);
        }
        if (event.type === "candidate") {
          candidatesCollected.push(event);
        }
        yield event;
      }
      const onlyCandidates = candidatesCollected.map((e) => e.candidate);
      if (onlyCandidates.length > 0) {
        await setCachedCandidates(rawSeed, archetypeId, onlyCandidates);
      }
      yield { type: "done", totalCostCents };
    } catch (err) {
      yield {
        type: "error",
        message: err instanceof Error ? err.message : String(err),
        recoverable: false,
      };
      yield { type: "done", totalCostCents };
    }
  }

  return new Response(sseStreamFromEvents(runPhase2()), {
    headers: sseHeaders(bundle.mode, ctx.byokHeader, {
      "x-icpfinder-phase": "candidates",
      "x-icpfinder-archetype": archetypeId,
    }),
  });
}
