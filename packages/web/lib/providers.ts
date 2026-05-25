// SPDX-License-Identifier: MIT
//
// Provider factory. Picks between live (Gemini + Hunter) and fake
// implementations based on env. Keeps the route handler ignorant of
// which providers it's talking to.

import {
  type EmailProvider,
  FakeEmailProvider,
  FakeLlmProvider,
  GeminiLlmProvider,
  HunterEmailProvider,
  type LlmProvider,
} from "@icpfinder/providers";

export interface ProviderBundle {
  llm: LlmProvider;
  email: EmailProvider;
}

export const buildProviders = (env: NodeJS.ProcessEnv = process.env): ProviderBundle => {
  const llm = env.GEMINI_API_KEY
    ? new GeminiLlmProvider({ apiKey: env.GEMINI_API_KEY })
    : new FakeLlmProvider();
  const email = env.HUNTER_API_KEY
    ? new HunterEmailProvider({ apiKey: env.HUNTER_API_KEY })
    : new FakeEmailProvider();
  return { llm, email };
};
