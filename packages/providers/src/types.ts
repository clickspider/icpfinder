/**
 * Provider interfaces — Hunter, Gemini, future Apollo/Clearbit/OpenAI all
 * implement these. Core algorithm depends only on the interface, never on
 * a concrete provider.
 *
 * Cost reporting is mandatory: every provider call returns the credits +
 * cents it consumed, so the caller can enforce per-request, per-session,
 * and per-day budget caps without leaking provider internals.
 */

export type Confidence = "low" | "medium" | "high";

/** Cost breakdown returned by every provider call. */
export interface CostUnit {
  /** Provider's native unit (Hunter credits, Gemini tokens, etc.) */
  units: number;
  /** Approximate USD cost in cents. */
  costCents: number;
  /** Provider name, e.g. "hunter" or "gemini". */
  provider: string;
  /** Endpoint or operation that consumed cost. */
  endpoint: string;
}

export type ProviderErrorCode = "auth" | "rate_limit" | "quota" | "network";
export type ProviderName = "gemini" | "hunter";

/** Lifecycle errors all providers may throw. */
export class ProviderAuthError extends Error {
  override name = "ProviderAuthError";
  readonly code: ProviderErrorCode = "auth";
  readonly provider: ProviderName;
  constructor(message: string, provider: ProviderName) {
    super(message);
    this.provider = provider;
  }
}

export class ProviderRateLimitError extends Error {
  override name = "ProviderRateLimitError";
  readonly code: ProviderErrorCode = "rate_limit";
  readonly provider: ProviderName;
  constructor(message: string, provider: ProviderName) {
    super(message);
    this.provider = provider;
  }
}

export class ProviderQuotaError extends Error {
  override name = "ProviderQuotaError";
  readonly code: ProviderErrorCode = "quota";
  readonly provider: ProviderName;
  constructor(message: string, provider: ProviderName) {
    super(message);
    this.provider = provider;
  }
}

export class ProviderNetworkError extends Error {
  override name = "ProviderNetworkError";
  readonly code: ProviderErrorCode = "network";
  readonly provider: ProviderName;
  constructor(message: string, provider: ProviderName) {
    super(message);
    this.provider = provider;
  }
}

const PROVIDER_ERROR_NAMES = new Set([
  "ProviderAuthError",
  "ProviderRateLimitError",
  "ProviderQuotaError",
  "ProviderNetworkError",
]);

export function isProviderError(
  err: unknown
): err is Error & { code: ProviderErrorCode; provider: ProviderName } {
  return (
    err instanceof Error &&
    PROVIDER_ERROR_NAMES.has(err.name) &&
    typeof (err as { code?: unknown }).code === "string" &&
    typeof (err as { provider?: unknown }).provider === "string"
  );
}

// ---------------------------------------------------------------------------
// EmailProvider
// ---------------------------------------------------------------------------

export interface DomainSearchInput {
  domain: string;
  /** Optional seniority filter (e.g. "senior", "executive"). */
  seniority?: string;
  /** Optional email-type filter. */
  type?: "personal" | "generic";
}

export interface DomainSearchContact {
  confidence: Confidence;
  firstName: string | null;
  lastName: string | null;
  position: string | null;
  score: number | null;
  seniority: string | null;
  email: string;
}

export interface DomainSearchResult {
  contacts: DomainSearchContact[];
  cost: CostUnit;
  /** True when running in stub/fake mode (no real API call made). */
  stub: boolean;
}

export interface FindEmailInput {
  domain: string;
  firstName: string;
  lastName: string;
}

export interface FindEmailResult {
  confidence: Confidence;
  email: string | null;
  score: number | null;
  status: string;
  cost: CostUnit;
  stub: boolean;
}

export interface VerifyEmailInput {
  email: string;
}

export interface VerifyEmailResult {
  confidence: Confidence;
  email: string;
  score: number | null;
  status: string;
  cost: CostUnit;
  stub: boolean;
}

/**
 * Pure email-discovery provider. Implementations: Hunter.io, Apollo (future),
 * Clearbit (future), Fake (fixture for `bun run demo`).
 */
export interface EmailProvider {
  /** Provider identifier, e.g. "hunter". */
  readonly name: string;
  /** True when no real API key configured; safe to use in demo mode. */
  readonly stub: boolean;

  findEmail(input: FindEmailInput): Promise<FindEmailResult>;
  verifyEmail(input: VerifyEmailInput): Promise<VerifyEmailResult>;
  searchDomain(input: DomainSearchInput): Promise<DomainSearchResult>;
}

// ---------------------------------------------------------------------------
// LlmProvider
// ---------------------------------------------------------------------------

export interface GenerateInput {
  /** System prompt. */
  system: string;
  /** User prompt. */
  prompt: string;
  /** Enable Google-grounded search (Gemini only; ignored elsewhere). */
  grounding?: boolean;
  /** Hint for output format. */
  format?: "json" | "text";
  /** Optional timeout in ms. */
  timeoutMs?: number;
}

export interface GenerateResult {
  text: string;
  cost: CostUnit;
  stub: boolean;
}

/**
 * Pure LLM provider. Implementations: Gemini, OpenAI (future), Anthropic
 * (future), Fake (fixture).
 */
export interface LlmProvider {
  readonly name: string;
  readonly stub: boolean;

  generate(input: GenerateInput): Promise<GenerateResult>;
}
