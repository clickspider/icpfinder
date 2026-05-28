// SPDX-License-Identifier: MIT
//
// /api/deepen — opt-in Gemini-grounded trigger + dossier for one candidate.
// Returns { candidateId, trigger, provenanceUrl, dossier }.
//
// Posture:
//   - Operator-paid: per-IP daily quota (default 25). Hit → 429 with CTA
//     telling the user to add a Gemini key for unlimited.
//   - BYOK Gemini: unlimited.
//   - 24h cache by candidateId (deterministic across re-clicks).
//   - Provenance URL is sanitized by sanitize-url.ts BEFORE returning —
//     anything not http(s) becomes null.

import { type NextRequest, NextResponse } from "next/server";
import type { DeepenResult } from "@icpfinder/core";
import {
  asString,
  buildApiContext,
  debitOperatorCost,
  getClientIp,
} from "@/lib/api-context";
import { reserveDeepen } from "@/lib/deepen-quota";
import { hashClientIp } from "@/lib/rate-limit";
import { getCachedDeepen, setCachedDeepen } from "@/lib/run-cache";
import { sanitizeProvenanceUrl } from "@/lib/sanitize-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface DeepenBody {
  seed?: unknown;
  candidateId?: unknown;
  companyName?: unknown;
  domain?: unknown;
  contactFirstName?: unknown;
  contactLastName?: unknown;
  contactRole?: unknown;
  geminiApiKey?: unknown;
  hunterApiKey?: unknown;
}

interface GeminiGroundedPart {
  text?: string;
}
interface GeminiGroundedCandidate {
  content?: { parts?: GeminiGroundedPart[] };
  groundingMetadata?: {
    groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
  };
}
interface GeminiGroundedResponse {
  candidates?: GeminiGroundedCandidate[];
}

const DEEPEN_TIMEOUT_MS = 12_000;

async function callGeminiGrounded(
  apiKey: string,
  prompt: string,
): Promise<{ text: string; firstUrl: string | null }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEEPEN_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        tools: [{ googleSearch: {} }],
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Gemini grounded returned ${res.status}: ${body.slice(0, 200)}`);
    }
    const json = (await res.json()) as GeminiGroundedResponse;
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
    const firstUrl =
      json.candidates?.[0]?.groundingMetadata?.groundingChunks?.find((c) => c.web?.uri)?.web
        ?.uri ?? null;
    return { text, firstUrl };
  } finally {
    clearTimeout(timeout);
  }
}

function buildPrompt(
  companyName: string,
  domain: string,
  contactRole: string | null,
): string {
  const role = contactRole ? ` (${contactRole})` : "";
  return `Find the most recent concrete trigger (within the last 90 days if possible) showing why ${companyName} (${domain})${role} is a strong buyer RIGHT NOW. Cite one source URL. Output two short paragraphs:

1) TRIGGER: One sentence naming the specific event (funding, hiring, launch, expansion, leadership change).

2) DOSSIER: 2-3 short lines giving outreach context for someone reaching out to this company today.`;
}

const buildOperatorTriggerFallback = (companyName: string): string =>
  `Based on the model's recent context, ${companyName} appears to be in an active growth phase. Open a Gemini key for verified live triggers.`;

export async function POST(request: NextRequest): Promise<Response> {
  let body: DeepenBody;
  try {
    body = (await request.json()) as DeepenBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const candidateId = asString(body.candidateId)?.trim();
  const companyName = asString(body.companyName)?.trim();
  const domain = asString(body.domain)?.trim();
  if (!candidateId || !companyName || !domain) {
    return NextResponse.json(
      { error: "candidateId, companyName, and domain are required" },
      { status: 400 },
    );
  }

  // 24h cache hit short-circuits everything.
  const cached = await getCachedDeepen(candidateId);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "x-icpfinder-cache": "hit" },
    });
  }

  const ctxResult = await buildApiContext(request, body);
  if (!ctxResult.ok) return ctxResult.response;
  const ctx = ctxResult.ctx;
  const { bundle } = ctx;

  // Per-IP quota gate — BYOK Gemini = unlimited.
  const byokGemini = bundle.byokProviders.includes("gemini");
  const clientIpHash = hashClientIp(getClientIp(request));
  const quota = reserveDeepen(clientIpHash, byokGemini);
  if (!quota.allowed) {
    return NextResponse.json(
      {
        error: `Daily Deepen quota reached (${quota.limit}). Add your own Gemini key for unlimited.`,
        code: "rate_limit",
        provider: "gemini",
        remaining: 0,
      },
      { status: 429 },
    );
  }

  // If we have no Gemini key at all (stub mode), return a synthesized
  // placeholder so the UI stays alive in local dev. Note: name is hardcoded
  // "gemini" even when the provider is in stub mode, so check `.stub`.
  const hasGemini = bundle.llm.name === "gemini" && !bundle.llm.stub;

  let result: DeepenResult;
  const contactRole = asString(body.contactRole) ?? null;
  if (!hasGemini) {
    result = {
      candidateId,
      trigger: `[STUB] ${companyName} signal placeholder — no Gemini key configured.`,
      provenanceUrl: null,
      dossier: `[STUB] Add a Gemini key for live grounding on ${domain}.`,
    };
  } else {
    // Pull the API key the bundle is using. GeminiLlmProvider doesn't expose
    // it directly, so we re-read from body / env to avoid a deeper refactor.
    const apiKey = asString(body.geminiApiKey) || process.env.GEMINI_API_KEY || "";
    if (!apiKey) {
      result = {
        candidateId,
        trigger: buildOperatorTriggerFallback(companyName),
        provenanceUrl: null,
        dossier: `Add a Gemini key to fetch live context for ${domain}.`,
      };
    } else {
      try {
        const { text, firstUrl } = await callGeminiGrounded(
          apiKey,
          buildPrompt(companyName, domain, contactRole),
        );
        const triggerMatch = text.match(/TRIGGER[:\s-]*([^\n]+)/i);
        const dossierMatch = text.match(/DOSSIER[:\s-]*([\s\S]+)/i);
        const trigger =
          triggerMatch?.[1]?.trim() ||
          text.split("\n").find((l) => l.trim())?.trim() ||
          `No public signal found this week for ${companyName}.`;
        const dossier =
          dossierMatch?.[1]?.trim() || text.slice(0, 500) || "No additional context found.";
        result = {
          candidateId,
          trigger,
          provenanceUrl: sanitizeProvenanceUrl(firstUrl),
          dossier,
        };
        // Record cost (best-effort fixed estimate — grounding doesn't return tokens).
        debitOperatorCost(ctx, bundle, "gemini", 0.5);
      } catch (err) {
        return NextResponse.json(
          {
            error:
              err instanceof Error
                ? `Deepen failed: ${err.message}`
                : "Deepen failed",
            code: "network",
            provider: "gemini",
          },
          { status: 502 },
        );
      }
    }
  }

  // Never cache stub results — they would poison the cache for subsequent
  // real runs once keys come online.
  const isStubResult =
    result.trigger.includes("[STUB]") || result.dossier.includes("[STUB]");
  if (!isStubResult) await setCachedDeepen(result);
  return NextResponse.json(result, {
    headers: { "x-icpfinder-cache": isStubResult ? "skip-stub" : "miss" },
  });
}
