// SPDX-License-Identifier: MIT
//
// Provider factory. Three modes:
//   1. BYOK — user pastes keys in the UI, request body carries them.
//      Live providers built from THOSE keys. Operator pays nothing.
//   2. Operator-paid — no keys in the request, operator env vars set.
//      Live providers built from server env, subject to caps + monthly budget.
//   3. Stub — neither user nor operator has keys. Falls back to Fake providers.

import {
  type EmailProvider,
  FakeEmailProvider,
  FakeLlmProvider,
  GeminiLlmProvider,
  HunterEmailProvider,
  type LlmProvider,
} from "@icpfinder/providers";

export type ProviderMode = "byok" | "operator" | "stub";

export interface ProviderBundle {
  llm: LlmProvider;
  email: EmailProvider;
  mode: ProviderMode;
}

export interface BuildProvidersInput {
  /** Keys supplied by the request body (BYOK). Trimmed by caller. */
  userGeminiKey?: string;
  userHunterKey?: string;
  /** Override env (testing). */
  env?: Record<string, string | undefined>;
}

export const buildProviders = (input: BuildProvidersInput = {}): ProviderBundle => {
  const env = input.env ?? process.env;
  const userGemini = input.userGeminiKey?.trim();
  const userHunter = input.userHunterKey?.trim();

  // BYOK only counts when BOTH keys are present. Mixed mode would
  // silently charge the operator for half the run — surprising
  // behavior, so we refuse it.
  const isByok = Boolean(userGemini && userHunter);
  const geminiKey = isByok ? userGemini : env.GEMINI_API_KEY;
  const hunterKey = isByok ? userHunter : env.HUNTER_API_KEY;

  const llm = geminiKey ? new GeminiLlmProvider({ apiKey: geminiKey }) : new FakeLlmProvider();
  const email = hunterKey
    ? new HunterEmailProvider({ apiKey: hunterKey })
    : new FakeEmailProvider();

  let mode: ProviderMode = "stub";
  if (isByok) mode = "byok";
  else if (geminiKey || hunterKey) mode = "operator";

  return { llm, email, mode };
};
