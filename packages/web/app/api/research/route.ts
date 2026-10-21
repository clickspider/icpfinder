// SPDX-License-Identifier: MIT
//
// /api/research — full SDR account research for ONE company: why-now,
// people, public posts, what they sell vs what they need, disqualifiers.
// Every finding is checked by code against the cited pages; only findings
// with >= 2 verified independent sources are marked "proven".
//
// Slow (several web-grounded LLM passes) — returns JSON, not SSE.
// Shares the Deepen per-IP quota: BYOK Gemini = unlimited.

import { researchAccount } from "@icpfinder/core";
import { type NextRequest, NextResponse } from "next/server";
import { asString, buildApiContext, clampInt, getClientIp } from "@/lib/api-context";
import { reserveDeepen } from "@/lib/deepen-quota";
import { hashClientIp, retryAfter } from "@/lib/rate-limit";
import { scanUrl } from "@/lib/scan-url";
import { classifySeed } from "@/lib/seed-input";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_SELLER_CHARS = 4_000;

interface ResearchBody {
  seed?: unknown;
  companyName?: unknown;
  domain?: unknown;
  contactName?: unknown;
  contactRole?: unknown;
  windowDays?: unknown;
  geminiApiKey?: unknown;
  hunterApiKey?: unknown;
}

export async function POST(request: NextRequest): Promise<Response> {
  let body: ResearchBody;
  try {
    body = (await request.json()) as ResearchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const companyName = asString(body.companyName)?.trim();
  const domain = asString(body.domain)?.trim().toLowerCase();
  if (!companyName || !domain) {
    return NextResponse.json({ error: "companyName and domain are required" }, { status: 400 });
  }

  const ctxResult = await buildApiContext(request, body);
  if (!ctxResult.ok) return ctxResult.response;
  const { bundle, seed: rawSeed } = ctxResult.ctx;

  if (bundle.llm.stub) {
    return NextResponse.json(
      { error: "Research needs a live LLM (Gemini key or ICPFINDER_LLM=claude-cli)." },
      { status: 400 }
    );
  }

  const quota = reserveDeepen(
    hashClientIp(getClientIp(request)),
    bundle.byokProviders.includes("gemini")
  );
  if (!quota.allowed) {
    return NextResponse.json(
      {
        error: `Daily research quota reached (${quota.limit}). Add your own Gemini key for unlimited.`,
        code: "rate_limit",
      },
      { status: 429, ...retryAfter(quota.retryAfterSeconds) }
    );
  }

  // Seller context = the seed, enriched from the seller's site when it is a URL.
  const classified = classifySeed(rawSeed);
  let sellerSummary = rawSeed;
  if (classified.kind === "url" && classified.url) {
    const scanned = await scanUrl(classified.url);
    if (scanned.seed) sellerSummary = scanned.seed;
  }

  try {
    const result = await researchAccount({
      llm: bundle.llm,
      seller: {
        summary: sellerSummary.slice(0, MAX_SELLER_CHARS),
        ...(classified.kind === "url" && classified.url ? { url: classified.url } : {}),
      },
      company: { name: companyName, domain },
      contact: {
        name: asString(body.contactName)?.trim(),
        role: asString(body.contactRole)?.trim(),
      },
      windowDays: clampInt(body.windowDays, 7, 365, 120),
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? `Research failed: ${err.message}` : "Research failed" },
      { status: 502 }
    );
  }
}
