// SPDX-License-Identifier: MIT
//
// /api/more-contacts — F10 follow-up to /api/candidates. Same seed +
// archetypeId, but enriches the NEXT N exampleCompanies (offset = how many
// the client already has). Returns an empty `done` if the archetype is out
// of exampleCompanies.

import { IcpFinder } from "@icpfinder/core";
import type { FindEvent } from "@icpfinder/core";
import { type NextRequest, NextResponse } from "next/server";
import {
  buildApiContext,
  clampInt,
  debitOperatorCost,
  sseHeaders,
} from "@/lib/api-context";
import { recallArchetypes, setCachedMoreCandidates } from "@/lib/run-cache";
import { sseStreamFromEvents } from "@/lib/sse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_BATCH = 5;

interface MoreContactsBody {
  seed?: unknown;
  archetypeId?: unknown;
  offset?: unknown;
  count?: unknown;
  geminiApiKey?: unknown;
  hunterApiKey?: unknown;
}

export async function POST(request: NextRequest): Promise<Response> {
  let body: MoreContactsBody;
  try {
    body = (await request.json()) as MoreContactsBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const archetypeId = typeof body.archetypeId === "string" ? body.archetypeId.trim() : "";
  if (!archetypeId) {
    return NextResponse.json({ error: "archetypeId is required" }, { status: 400 });
  }
  const offset = clampInt(body.offset, 0, 50, 0);
  const count = clampInt(body.count, 1, 10, DEFAULT_BATCH);

  const ctxResult = await buildApiContext(request, body);
  if (!ctxResult.ok) return ctxResult.response;
  const ctx = ctxResult.ctx;
  const { bundle, seed: rawSeed } = ctx;

  const archetypes = await recallArchetypes(rawSeed);
  const archetype = archetypes?.find((a) => a.id === archetypeId);
  if (!archetype) {
    return NextResponse.json(
      { error: "Session expired — paste your seed again.", code: "stale_archetype" },
      { status: 410 },
    );
  }
  if (offset >= archetype.exampleCompanies.length) {
    // Empty done — client renders "out of contacts" UX.
    async function* empty(): AsyncGenerator<FindEvent, void, void> {
      yield { type: "done", totalCostCents: 0 };
    }
    return new Response(sseStreamFromEvents(empty()), {
      headers: sseHeaders(bundle.mode, ctx.byokHeader, {
        "x-icpfinder-phase": "more-contacts",
        "x-icpfinder-out-of-contacts": "1",
      }),
    });
  }

  const finder = new IcpFinder({ llm: bundle.llm, email: bundle.email });
  const targetArchetype = archetype;

  async function* runMore(): AsyncGenerator<FindEvent, void, void> {
    let totalCostCents = 0;
    const newCandidates: Array<FindEvent & { type: "candidate" }> = [];
    try {
      for await (const event of finder.enrichOne(targetArchetype, {
        candidatesPerArchetype: count,
        offset,
        signal: request.signal,
      })) {
        if (event.type === "cost") {
          totalCostCents += event.cost.costCents;
          debitOperatorCost(ctx, bundle, event.cost.provider, event.cost.costCents);
        }
        if (event.type === "candidate") newCandidates.push(event);
        yield event;
      }
      if (newCandidates.length > 0) {
        await setCachedMoreCandidates(
          rawSeed,
          archetypeId,
          offset,
          newCandidates.map((e) => e.candidate),
        );
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

  return new Response(sseStreamFromEvents(runMore()), {
    headers: sseHeaders(bundle.mode, ctx.byokHeader, {
      "x-icpfinder-phase": "more-contacts",
      "x-icpfinder-archetype": archetypeId,
      "x-icpfinder-offset": String(offset),
    }),
  });
}
