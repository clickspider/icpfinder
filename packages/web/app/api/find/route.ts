// SPDX-License-Identifier: MIT

import { IcpFinder } from "@icpfinder/core";
import { type NextRequest, NextResponse } from "next/server";
import { getMonthlyBudget } from "@/lib/monthly-budget";
import { getRunRecorder } from "@/lib/prisma";
import { buildProviders } from "@/lib/providers";
import { getDefaultRateLimiter, hashClientIp } from "@/lib/rate-limit";
import { streamRun } from "@/lib/run-stream";
import { scanUrl } from "@/lib/scan-url";
import { classifySeed } from "@/lib/seed-input";
import { sseStreamFromEvents } from "@/lib/sse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SEED_LENGTH = 8_000;
const MAX_RAW_SEED_LENGTH = 2_000;
const DEFAULT_BUDGET_CAP_CENTS = 100;
const FREE_TIER_ARCHETYPE_LIMIT = 1;
const FREE_TIER_CANDIDATES_PER_ARCHETYPE = 3;
const BYOK_DEFAULT_ARCHETYPE_LIMIT = 3;
const BYOK_DEFAULT_CANDIDATES_PER_ARCHETYPE = 5;

interface FindRequestBody {
  seed?: unknown;
  archetypeLimit?: unknown;
  candidatesPerArchetype?: unknown;
  grounding?: unknown;
  /** User-supplied Gemini key (BYOK). Never persisted. */
  geminiApiKey?: unknown;
  /** User-supplied Hunter key (BYOK). Never persisted. */
  hunterApiKey?: unknown;
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

const asString = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

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
  if (body.seed.length > MAX_RAW_SEED_LENGTH) {
    return NextResponse.json(
      { error: `seed exceeds ${MAX_RAW_SEED_LENGTH} chars` },
      { status: 400 },
    );
  }

  const classified = classifySeed(body.seed);
  let effectiveSeed = body.seed.trim();

  const { llm, email, mode } = buildProviders({
    userGeminiKey: asString(body.geminiApiKey),
    userHunterKey: asString(body.hunterApiKey),
  });

  const clientIpHash = hashClientIp(getClientIp(request));
  const limiter = getDefaultRateLimiter();
  const monthlyBudget = getMonthlyBudget();

  let archetypeLimit: number;
  let candidatesPerArchetype: number;
  let budgetCapCents: number;

  if (mode === "byok") {
    // User pays — no rate limit, no operator budget guard.
    archetypeLimit = clampInt(body.archetypeLimit, 1, 5, BYOK_DEFAULT_ARCHETYPE_LIMIT);
    candidatesPerArchetype = clampInt(
      body.candidatesPerArchetype,
      1,
      10,
      BYOK_DEFAULT_CANDIDATES_PER_ARCHETYPE
    );
    budgetCapCents = Number.POSITIVE_INFINITY;
  } else {
    // Operator-paid (live or stub). Enforce both per-IP and monthly caps.
    const check = await limiter.reserveRun(clientIpHash);
    if (!check.allowedRun) {
      return NextResponse.json(
        {
          error: "Daily free-tier limit reached. Add your own API keys for unlimited runs.",
          mode,
          remainingRuns: check.remainingRuns,
          remainingCents: check.remainingCents,
        },
        { status: 429 }
      );
    }
    if (mode === "operator" && !(await monthlyBudget.isAvailable())) {
      return NextResponse.json(
        {
          error:
            "Monthly free-tier budget exhausted. Add your own API keys to keep going — they stay in your browser and cost the operator $0.",
          mode,
        },
        { status: 402 }
      );
    }
    archetypeLimit = clampInt(
      body.archetypeLimit,
      1,
      FREE_TIER_ARCHETYPE_LIMIT,
      FREE_TIER_ARCHETYPE_LIMIT
    );
    candidatesPerArchetype = clampInt(
      body.candidatesPerArchetype,
      1,
      FREE_TIER_CANDIDATES_PER_ARCHETYPE,
      FREE_TIER_CANDIDATES_PER_ARCHETYPE
    );
    budgetCapCents = Math.min(
      Number(process.env.ICPFINDER_BUDGET_CAP_CENTS ?? DEFAULT_BUDGET_CAP_CENTS),
      check.remainingCents
    );
  }

  // URL detection runs AFTER rate-limit reservation so anonymous attackers
  // cannot use /api/find as an unrate-limited outbound-fetch primitive. Scan
  // failure is non-fatal — fall back to the raw URL so the LLM still has the
  // domain to reason about. SSRF-protected in scan-url.ts.
  if (classified.kind === "url" && classified.url) {
    const scanned = await scanUrl(classified.url);
    if (scanned.seed && scanned.seed.length > 0) {
      effectiveSeed = scanned.seed;
    }
  }
  if (effectiveSeed.length > MAX_SEED_LENGTH) {
    effectiveSeed = effectiveSeed.slice(0, MAX_SEED_LENGTH);
  }

  const finder = new IcpFinder({ llm, email });

  const stream = sseStreamFromEvents(
    streamRun({
      finder,
      recorder: getRunRecorder(),
      rateLimiter: limiter,
      monthlyBudget: mode === "operator" ? monthlyBudget : undefined,
      clientIpHash,
      mode,
      input: {
        seed: effectiveSeed,
        archetypeLimit,
        candidatesPerArchetype,
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
      "x-icpfinder-mode": mode,
    },
  });
}
