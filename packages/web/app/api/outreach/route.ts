// SPDX-License-Identifier: MIT
//
// /api/outreach — generates a 2-line cold opener for one candidate. Two
// modes:
//   - Operator (or stub): renders the static template (no LLM call). Free
//     and instant.
//   - BYOK Gemini: asks the model for a draft. If the model refuses or
//     errors, falls back to the same template so the clipboard always
//     receives a usable draft.

import { type NextRequest, NextResponse } from "next/server";
import { asString, buildApiContext } from "@/lib/api-context";
import { renderOutreachTemplate } from "@/lib/outreach-template";
import { getCachedOutreach, setCachedOutreach } from "@/lib/run-cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface OutreachBody {
  seed?: unknown;
  candidateId?: unknown;
  firstName?: unknown;
  companyName?: unknown;
  archetypeRole?: unknown;
  sellingAngle?: unknown;
  whyNow?: unknown;
  geminiApiKey?: unknown;
  hunterApiKey?: unknown;
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}

const OUTREACH_TIMEOUT_MS = 10_000;

async function llmDraft(apiKey: string, prompt: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OUTREACH_TIMEOUT_MS);
  try {
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        }),
        signal: controller.signal,
      },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as GeminiResponse;
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
    if (!text || /^(I cannot|I'm sorry|As an AI)/i.test(text)) return null;
    return text;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  let body: OutreachBody;
  try {
    body = (await request.json()) as OutreachBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const candidateId = asString(body.candidateId)?.trim();
  const companyName = asString(body.companyName)?.trim();
  const archetypeRole = asString(body.archetypeRole)?.trim() || "decision-maker";
  if (!candidateId || !companyName) {
    return NextResponse.json(
      { error: "candidateId and companyName are required" },
      { status: 400 },
    );
  }

  const firstName = asString(body.firstName)?.trim() || null;
  const sellingAngle = asString(body.sellingAngle)?.trim() || undefined;
  const whyNow = asString(body.whyNow)?.trim() || undefined;

  // 24h cache
  const cached = await getCachedOutreach(candidateId);
  if (cached) {
    return NextResponse.json(
      { candidateId, draft: cached, source: "cache" },
      { headers: { "x-icpfinder-cache": "hit" } },
    );
  }

  const ctxResult = await buildApiContext(request, body);
  if (!ctxResult.ok) return ctxResult.response;
  const { bundle } = ctxResult.ctx;

  const templateDraft = renderOutreachTemplate({
    firstName,
    companyName,
    archetypeRole,
    sellingAngle,
    whyNow,
  });

  const userGemini = asString(body.geminiApiKey)?.trim() || "";
  const useLlm = bundle.byokProviders.includes("gemini") && userGemini;
  let draft = templateDraft;
  let source: "template" | "llm" = "template";
  if (useLlm) {
    const prompt = `Write a 2-line cold outreach email to ${firstName ?? `the ${archetypeRole}`} at ${companyName}. Reference: ${whyNow ?? "their recent activity"}. Pitch angle: ${sellingAngle ?? "we help similar teams"}. No subject line, no greeting boilerplate, no signoff. Two short lines only.`;
    const llm = await llmDraft(userGemini, prompt);
    if (llm) {
      draft = llm;
      source = "llm";
    }
  }

  await setCachedOutreach(candidateId, draft);
  return NextResponse.json(
    { candidateId, draft, source },
    { headers: { "x-icpfinder-cache": "miss" } },
  );
}
