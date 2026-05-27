// SPDX-License-Identifier: MIT
//
// GeminiLlmProvider — Google Gemini implementation of LlmProvider.
//
// Direct REST against the Generative Language API. No SDK dependency —
// keeps the package light and avoids version drift with @google/genai.
// Grounding (Google Search tool) is opt-in via input.grounding=true.

import {
  type CostUnit,
  type GenerateInput,
  type GenerateResult,
  type LlmProvider,
  ProviderAuthError,
  ProviderNetworkError,
  ProviderQuotaError,
  ProviderRateLimitError,
} from "./types";

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_MODEL = "gemini-2.5-flash";
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_RATE_LIMIT_RETRIES = 5;
const RATE_LIMIT_BACKOFF_BASE_MS = 1000;
const SERVER_ERROR_RETRY_BASE_MS = 500;

/**
 * Approximate cost in cents per 1k output tokens for gemini-2.5-flash.
 * Real Gemini billing distinguishes input vs output and grounding calls;
 * for our budget-cap purposes a single blended rate is enough. Override
 * via constructor if pricing moves.
 */
const DEFAULT_COST_CENTS_PER_1K_OUT_TOKENS = 0.06;

interface GeminiCostLoggerEvent {
  endpoint: "generate";
  cost: CostUnit;
  grounding: boolean;
}

export type GeminiCostLogger = (event: GeminiCostLoggerEvent) => void | Promise<void>;

export interface GeminiOptions {
  apiKey?: string;
  model?: string;
  /** Cents per 1k output tokens. Defaults to gemini-2.5-flash list price. */
  costCentsPer1kOutTokens?: number;
  /** Per-request timeout in ms. */
  timeoutMs?: number;
  /** Optional cost logger (per-call). */
  onCost?: GeminiCostLogger;
  /** Override fetch (testing). */
  fetchImpl?: typeof fetch;
  /** Base ms for jittered exponential 429 backoff. Tests override with 0. */
  rateLimitBackoffBaseMs?: number;
}

interface GeminiGenerateRequestBody {
  contents: Array<{
    role: "user";
    parts: Array<{ text: string }>;
  }>;
  systemInstruction?: {
    parts: Array<{ text: string }>;
  };
  tools?: Array<{ googleSearch: Record<string, never> }>;
  generationConfig?: {
    responseMimeType?: "application/json" | "text/plain";
  };
}

interface GeminiGenerateResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const buildStubArchetypes = (): string =>
  JSON.stringify(
    [
      {
        industry: "[STUB] Generic SaaS",
        role: "Founder",
        companySize: "1-10 employees",
        pain: "Stub pain placeholder.",
        buyingSignals: ["[STUB] signal A", "[STUB] signal B", "[STUB] signal C"],
      },
    ],
    null,
    2
  );

export class GeminiLlmProvider implements LlmProvider {
  readonly name = "gemini";
  readonly stub: boolean;

  private readonly apiKey: string | undefined;
  private readonly model: string;
  private readonly costCentsPer1kOutTokens: number;
  private readonly timeoutMs: number;
  private readonly onCost: GeminiCostLogger | undefined;
  private readonly fetchImpl: typeof fetch;
  private readonly rateLimitBackoffBaseMs: number;

  constructor(opts: GeminiOptions = {}) {
    this.apiKey = opts.apiKey;
    this.stub = !this.apiKey;
    this.model = opts.model ?? DEFAULT_MODEL;
    this.costCentsPer1kOutTokens =
      opts.costCentsPer1kOutTokens ?? DEFAULT_COST_CENTS_PER_1K_OUT_TOKENS;
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.onCost = opts.onCost;
    this.fetchImpl = opts.fetchImpl ?? globalThis.fetch;
    this.rateLimitBackoffBaseMs = opts.rateLimitBackoffBaseMs ?? RATE_LIMIT_BACKOFF_BASE_MS;
  }

  private buildCost(outputTokens: number): CostUnit {
    return {
      units: outputTokens,
      costCents: Math.round((outputTokens / 1000) * this.costCentsPer1kOutTokens * 100) / 100,
      provider: "gemini",
      endpoint: "generate",
    };
  }

  private async logCost(cost: CostUnit, grounding: boolean): Promise<void> {
    if (!this.onCost) return;
    try {
      await this.onCost({ endpoint: "generate", cost, grounding });
    } catch {
      // Logger errors must never break the provider.
    }
  }

  async generate(input: GenerateInput): Promise<GenerateResult> {
    if (!this.apiKey) {
      const text = input.format === "json" ? buildStubArchetypes() : "[STUB] response";
      const cost = this.buildCost(0);
      await this.logCost(cost, input.grounding ?? false);
      return { text, cost, stub: true };
    }

    const body: GeminiGenerateRequestBody = {
      contents: [{ role: "user", parts: [{ text: input.prompt }] }],
    };

    if (input.system) {
      body.systemInstruction = { parts: [{ text: input.system }] };
    }
    if (input.grounding) {
      body.tools = [{ googleSearch: {} }];
    }
    if (input.format === "json") {
      // Grounding + responseMimeType=application/json are mutually exclusive
      // per Gemini API constraints; grounding wins when both requested.
      if (!input.grounding) {
        body.generationConfig = { responseMimeType: "application/json" };
      }
    }

    const url = `${GEMINI_BASE_URL}/models/${this.model}:generateContent`;
    const json = await this.fetchGemini(url, body, input.timeoutMs ?? this.timeoutMs);

    const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const outputTokens = json.usageMetadata?.candidatesTokenCount ?? 0;
    const cost = this.buildCost(outputTokens);
    await this.logCost(cost, input.grounding ?? false);

    return { text, cost, stub: false };
  }

  private async fetchGemini(
    url: string,
    body: GeminiGenerateRequestBody,
    timeoutMs: number
  ): Promise<GeminiGenerateResponse> {
    let attempt = 0;
    let serverErrorAttempts = 0;
    while (attempt <= MAX_RATE_LIMIT_RETRIES) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      let response: Response;
      try {
        response = await this.fetchImpl(url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            // biome-ignore lint/style/useNamingConvention: Google header name
            "x-goog-api-key": this.apiKey ?? "",
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          throw new ProviderNetworkError(`Gemini request timed out after ${timeoutMs}ms`, "gemini");
        }
        throw new ProviderNetworkError(
          `Network error reaching Gemini: ${err instanceof Error ? err.message : String(err)}`,
          "gemini"
        );
      } finally {
        clearTimeout(timeoutId);
      }
      if (response.status === 401 || response.status === 403) {
        throw new ProviderAuthError(
          `Gemini rejected the API key (${response.status}) on generateContent`,
          "gemini"
        );
      }
      if (response.status === 429) {
        const raw = await response.text().catch(() => "");
        if (raw.includes("RESOURCE_EXHAUSTED") || /quota/i.test(raw)) {
          throw new ProviderQuotaError("Gemini daily quota exhausted", "gemini");
        }
        attempt += 1;
        if (attempt > MAX_RATE_LIMIT_RETRIES) {
          throw new ProviderRateLimitError(
            `Gemini rate limit exceeded after ${MAX_RATE_LIMIT_RETRIES} retries`,
            "gemini"
          );
        }
        const jitter = 0.5 + Math.random();
        const backoff = this.rateLimitBackoffBaseMs * 2 ** (attempt - 1) * jitter;
        await sleep(backoff);
        continue;
      }
      if (response.status >= 500) {
        serverErrorAttempts += 1;
        if (serverErrorAttempts > 1) {
          throw new ProviderNetworkError(
            `Gemini server error ${response.status} (no further retries)`,
            "gemini"
          );
        }
        await sleep(SERVER_ERROR_RETRY_BASE_MS);
        continue;
      }
      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(`Gemini returned ${response.status}: ${errorText.slice(0, 200)}`);
      }
      return (await response.json()) as GeminiGenerateResponse;
    }
    throw new ProviderRateLimitError(
      `Gemini rate limit exceeded after ${MAX_RATE_LIMIT_RETRIES} retries`,
      "gemini"
    );
  }
}
