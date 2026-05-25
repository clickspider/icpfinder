// SPDX-License-Identifier: MIT
//
// Archetype generation — prompts the LLM with the user's seed and
// parses the JSON response into a typed Archetype[]. Defensive parse:
// every field falls back to a placeholder rather than throwing, so
// streaming partial results keeps flowing if the model misbehaves.

import type { GenerateInput, LlmProvider } from "@icpfinder/providers";
import type { Archetype } from "./types";

const SYSTEM_PROMPT = `You are an ICP (Ideal Customer Profile) analyst.
You help founders and indie builders find concrete buyer personas for
their product. Output is strict JSON only: a top-level array of
archetype objects, no prose, no markdown fences.

Each archetype object MUST have these exact fields:
- industry (string, e.g. "B2B SaaS", "E-commerce")
- role (string, decision-maker job title, e.g. "Head of Marketing")
- companySize (string, e.g. "10-50 employees", "Series A")
- pain (string, one-sentence concrete pain the product solves)
- buyingSignals (string[], 3-5 observable signals the company is
  currently in pain — e.g. "hiring SDRs", "recently funded",
  "expanded to new market")

Generate distinct archetypes that target different buyer segments,
not minor variations of the same persona.`;

const buildUserPrompt = (seed: string, limit: number): string =>
  `Product / company description:\n${seed.trim()}\n\nGenerate ${limit} distinct ICP archetypes as a JSON array.`;

/**
 * Strips common LLM artifacts — markdown fences, leading prose — and
 * returns the JSON substring. Tolerant: the caller will JSON.parse and
 * throw if even this fails.
 */
const extractJsonArray = (raw: string): string => {
  const trimmed = raw.trim();
  if (trimmed.startsWith("[")) return trimmed;
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenceMatch?.[1]) return fenceMatch[1].trim();
  const start = trimmed.indexOf("[");
  const end = trimmed.lastIndexOf("]");
  if (start !== -1 && end !== -1 && end > start) {
    return trimmed.slice(start, end + 1);
  }
  return trimmed;
};

const coerceString = (v: unknown, fallback: string): string =>
  typeof v === "string" && v.trim() ? v.trim() : fallback;

const coerceStringArray = (v: unknown): string[] => {
  if (!Array.isArray(v)) return [];
  return v
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim());
};

export const parseArchetypes = (raw: string): Archetype[] => {
  const json = extractJsonArray(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.map((entry, index) => {
    const obj = (entry ?? {}) as Record<string, unknown>;
    return {
      id: `arch_${index}`,
      industry: coerceString(obj.industry, "Unknown industry"),
      role: coerceString(obj.role, "Unknown role"),
      companySize: coerceString(obj.companySize, "Unknown size"),
      pain: coerceString(obj.pain, ""),
      buyingSignals: coerceStringArray(obj.buyingSignals),
    };
  });
};

export interface GenerateArchetypesInput {
  llm: LlmProvider;
  seed: string;
  limit: number;
  grounding: boolean;
  timeoutMs?: number;
}

export interface GenerateArchetypesResult {
  archetypes: Archetype[];
  costCents: number;
  stub: boolean;
}

/**
 * One LLM call. The provider's stub mode returns a deterministic
 * single-archetype fixture, so callers always get at least one
 * archetype back (or an empty array if the model returns garbage).
 */
export const generateArchetypes = async (
  input: GenerateArchetypesInput
): Promise<GenerateArchetypesResult> => {
  const genInput: GenerateInput = {
    system: SYSTEM_PROMPT,
    prompt: buildUserPrompt(input.seed, input.limit),
    format: "json",
    grounding: input.grounding,
    timeoutMs: input.timeoutMs,
  };
  const result = await input.llm.generate(genInput);
  const archetypes = parseArchetypes(result.text).slice(0, input.limit);
  return {
    archetypes,
    costCents: result.cost.costCents,
    stub: result.stub,
  };
};
