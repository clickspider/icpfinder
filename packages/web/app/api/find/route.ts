// SPDX-License-Identifier: MIT

import { IcpFinder } from "@icpfinder/core";
import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildProviders } from "@/lib/providers";
import { getDefaultRateLimiter, hashClientIp } from "@/lib/rate-limit";
import { streamRun } from "@/lib/run-stream";
import { sseStreamFromEvents } from "@/lib/sse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SEED_LENGTH = 2_000;
const DEFAULT_BUDGET_CAP_CENTS = 200;

interface FindRequestBody {
  seed?: unknown;
  archetypeLimit?: unknown;
  candidatesPerArchetype?: unknown;
  grounding?: unknown;
}

const clampInt = (raw: unknown, min: number, max: number, fallback: number): number => {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
};

const getClientIp = (request: NextRequest): string => {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip") ?? "0.0.0.0";
};

export async function POST(request: NextRequest): Promise<Response> {
  let body: FindRequestBody;
  try {
    body = (await request.json()) as FindRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.seed !== "string" || !body.seed.trim()) {
    return NextResponse.json({ error: "seed is required" }, { status: 400 });
  }
  if (body.seed.length > MAX_SEED_LENGTH) {
    return NextResponse.json({ error: `seed exceeds ${MAX_SEED_LENGTH} chars` }, { status: 400 });
  }

  const clientIpHash = hashClientIp(getClientIp(request));
  const limiter = getDefaultRateLimiter();
  const check = await limiter.reserveRun(clientIpHash);
  if (!check.allowedRun) {
    return NextResponse.json(
      {
        error: "Daily rate limit reached",
        remainingRuns: check.remainingRuns,
        remainingCents: check.remainingCents,
      },
      { status: 429 }
    );
  }

  const { llm, email } = buildProviders();
  const finder = new IcpFinder({ llm, email });
  const budgetCapCents = Math.min(
    Number(process.env.ICPFINDER_BUDGET_CAP_CENTS ?? DEFAULT_BUDGET_CAP_CENTS),
    check.remainingCents
  );

  const stream = sseStreamFromEvents(
    streamRun({
      finder,
      prisma,
      rateLimiter: limiter,
      clientIpHash,
      input: {
        seed: body.seed,
        archetypeLimit: clampInt(body.archetypeLimit, 1, 5, 3),
        candidatesPerArchetype: clampInt(body.candidatesPerArchetype, 1, 10, 5),
        grounding: body.grounding === true,
        budgetCapCents,
        signal: request.signal,
      },
    })
  );

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
