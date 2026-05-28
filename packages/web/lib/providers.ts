// SPDX-License-Identifier: MIT
//
// Provider factory. Mixed-mode BYOK — each side (LLM, email) independently
// reports which keys came from the user vs the operator. The route handler
// uses `byokProviders` to decide which sides to bill against the operator's
// per-IP and monthly caps; user-paid sides are free for the operator.
//
// Three top-level modes for back-compat with response headers:
//   - "byok"     — at least one user key supplied, no operator-paid side
//   - "operator" — operator pays one or both sides (mixed allowed)
//   - "stub"     — no real keys anywhere → Fake providers
//
// The 3×3 (userGemini × userHunter) resolution matrix is documented in the
// CEO plan; tests pin every cell.

import {
  type EmailProvider,
  FakeEmailProvider,
  FakeLlmProvider,
  GeminiLlmProvider,
  HunterEmailProvider,
  type LlmProvider,
} from "@icpfinder/providers";

export type ProviderMode = "byok" | "operator" | "stub";
export type BillingSide = "gemini" | "hunter";

export interface ProviderBundle {
  llm: LlmProvider;
  email: EmailProvider;
  mode: ProviderMode;
  /** Sides whose keys were supplied by the user. Operator does not pay these. */
  byokProviders: BillingSide[];
  /** Sides whose keys came from operator env. Subject to caps. */
  operatorPaidSides: BillingSide[];
}

export interface BuildProvidersInput {
  /** Keys supplied by the request body (BYOK). Trimmed by caller. */
  userGeminiKey?: string;
  userHunterKey?: string;
  /** Override env (testing). */
  env?: Record<string, string | undefined>;
}

const trimOrEmpty = (v: string | undefined): string => (typeof v === "string" ? v.trim() : "");

export const buildProviders = (input: BuildProvidersInput = {}): ProviderBundle => {
  const env = input.env ?? process.env;
  const userGemini = trimOrEmpty(input.userGeminiKey);
  const userHunter = trimOrEmpty(input.userHunterKey);
  const envGemini = trimOrEmpty(env.GEMINI_API_KEY);
  const envHunter = trimOrEmpty(env.HUNTER_API_KEY);

  // Per-side key resolution — user wins when present.
  const geminiKey = userGemini || envGemini;
  const hunterKey = userHunter || envHunter;
  const geminiFromUser = Boolean(userGemini);
  const hunterFromUser = Boolean(userHunter);

  const llm = geminiKey ? new GeminiLlmProvider({ apiKey: geminiKey }) : new FakeLlmProvider();
  const email = hunterKey
    ? new HunterEmailProvider({ apiKey: hunterKey })
    : new FakeEmailProvider();

  const byokProviders: BillingSide[] = [];
  if (geminiFromUser) byokProviders.push("gemini");
  if (hunterFromUser) byokProviders.push("hunter");

  const operatorPaidSides: BillingSide[] = [];
  if (geminiKey && !geminiFromUser) operatorPaidSides.push("gemini");
  if (hunterKey && !hunterFromUser) operatorPaidSides.push("hunter");

  // Mode resolution: any user key → byok (even partial); else operator if any
  // live key from env; else stub.
  let mode: ProviderMode = "stub";
  if (byokProviders.length > 0 && operatorPaidSides.length === 0) {
    mode = "byok";
  } else if (geminiKey || hunterKey) {
    mode = "operator";
  }

  return { llm, email, mode, byokProviders, operatorPaidSides };
};

/** Comma-joined header value for `x-icpfinder-byok-providers`. */
export const byokProvidersHeader = (sides: BillingSide[]): string =>
  sides.length === 0 ? "none" : sides.join(",");
