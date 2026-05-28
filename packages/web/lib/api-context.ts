// SPDX-License-Identifier: MIT
//
// Shared bootstrapping for the new two-phase + opt-in endpoints
// (/api/archetypes, /api/candidates, /api/deepen, /api/more-contacts,
// /api/outreach). Centralizes seed validation, BYOK provider building,
// rate-limit gating, client-IP hashing, and SSE headers so each route stays
// small.

import { type NextRequest, NextResponse } from "next/server";
import { getMonthlyBudget, type MonthlyBudget } from "./monthly-budget";
import {
  type BillingSide,
  type ProviderBundle,
  type ProviderMode,
  buildProviders,
  byokProvidersHeader,
} from "./providers";
import { getDefaultRateLimiter, hashClientIp, type RateLimiter } from "./rate-limit";

export const MAX_RAW_SEED_LENGTH = 2_000;

export interface SeedBody {
  seed?: unknown;
  geminiApiKey?: unknown;
  hunterApiKey?: unknown;
}

export const asString = (v: unknown): string | undefined =>
  typeof v === "string" ? v : undefined;

export const clampInt = (
  raw: unknown,
  min: number,
  max: number,
  fallback: number,
): number => {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
};

export const getClientIp = (request: NextRequest): string => {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip") ?? "0.0.0.0";
};

export interface ApiContext {
  seed: string;
  bundle: ProviderBundle;
  limiter: RateLimiter;
  monthlyBudget: MonthlyBudget;
  clientIpHash: string;
  byokHeader: string;
}

export interface ApiContextOptions {
  /** When true, run a rate-limit reserveRun() before returning. */
  enforceRateLimit?: boolean;
  /** When true and operatorPaidSides non-empty, check monthly budget. */
  enforceMonthlyBudget?: boolean;
}

export type ApiContextResult =
  | { ok: true; ctx: ApiContext }
  | { ok: false; response: Response };

export async function buildApiContext(
  request: NextRequest,
  body: SeedBody,
  opts: ApiContextOptions = {},
): Promise<ApiContextResult> {
  if (typeof body.seed !== "string" || !body.seed.trim()) {
    return {
      ok: false,
      response: NextResponse.json({ error: "seed is required" }, { status: 400 }),
    };
  }
  if (body.seed.length > MAX_RAW_SEED_LENGTH) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `seed exceeds ${MAX_RAW_SEED_LENGTH} chars` },
        { status: 400 },
      ),
    };
  }
  const seed = body.seed.trim();
  const bundle = buildProviders({
    userGeminiKey: asString(body.geminiApiKey),
    userHunterKey: asString(body.hunterApiKey),
  });
  const byokHeader = byokProvidersHeader(bundle.byokProviders);
  const limiter = getDefaultRateLimiter();
  const monthlyBudget = getMonthlyBudget();
  const clientIpHash = hashClientIp(getClientIp(request));

  if (opts.enforceRateLimit && bundle.operatorPaidSides.length > 0) {
    const primaryProvider: BillingSide = bundle.operatorPaidSides[0] ?? "gemini";
    const check = await limiter.reserveRun(clientIpHash);
    if (!check.allowedRun) {
      return {
        ok: false,
        response: NextResponse.json(
          {
            error: `Daily free-tier limit reached. Paste your own ${primaryProvider} key for unlimited runs.`,
            code: "rate_limit",
            provider: primaryProvider,
            mode: bundle.mode,
            remainingRuns: check.remainingRuns,
            remainingCents: check.remainingCents,
          },
          { status: 429 },
        ),
      };
    }
    if (opts.enforceMonthlyBudget && !(await monthlyBudget.isAvailable())) {
      return {
        ok: false,
        response: NextResponse.json(
          {
            error: "Free demo is at capacity right now from previous requests.",
            code: "quota",
            provider: primaryProvider,
            mode: bundle.mode,
          },
          { status: 402 },
        ),
      };
    }
  }

  return {
    ok: true,
    ctx: { seed, bundle, limiter, monthlyBudget, clientIpHash, byokHeader },
  };
}

export const sseHeaders = (
  mode: ProviderMode,
  byokHeader: string,
  extra: Record<string, string> = {},
): HeadersInit => ({
  "content-type": "text/event-stream; charset=utf-8",
  "cache-control": "no-cache, no-transform",
  connection: "keep-alive",
  "x-accel-buffering": "no",
  "x-icpfinder-mode": mode,
  "x-icpfinder-byok-providers": byokHeader,
  ...extra,
});

/**
 * Debit cost from per-IP and monthly budgets only when the cost came from an
 * operator-paid side. Fire-and-forget — errors never break the stream.
 */
export function debitOperatorCost(
  ctx: ApiContext,
  bundle: ProviderBundle,
  provider: string,
  costCents: number,
): void {
  const side: BillingSide | null =
    provider === "gemini" ? "gemini" : provider === "hunter" ? "hunter" : null;
  if (!side || !bundle.operatorPaidSides.includes(side)) return;
  ctx.limiter.recordCost(ctx.clientIpHash, costCents).catch(() => undefined);
  ctx.monthlyBudget.recordCost(costCents).catch(() => undefined);
}
