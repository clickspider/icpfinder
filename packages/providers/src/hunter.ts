// SPDX-License-Identifier: MIT
//
// HunterEmailProvider — Hunter.io implementation of EmailProvider.
//
// Extracted from insidermatch `packages/outbound/src/hunter.ts` (MIT-relicensed).
// Stripped: @repo/database (HunterLookupLog writes), @repo/email/keys, server-only.
// Added: constructor-injected apiKey, optional logger callback, cost reporting
// on every call.

import pLimit from "p-limit";

import {
  type Confidence,
  type CostUnit,
  type DomainSearchContact,
  type DomainSearchInput,
  type DomainSearchResult,
  type EmailProvider,
  type FindEmailInput,
  type FindEmailResult,
  ProviderAuthError,
  ProviderRateLimitError,
  type VerifyEmailInput,
  type VerifyEmailResult,
} from "./types";

const HUNTER_BASE_URL = "https://api.hunter.io/v2";
const DEFAULT_CONCURRENCY = 5;
const MAX_RATE_LIMIT_RETRIES = 3;
const SERVER_ERROR_RETRY_BASE_MS = 500;
const RATE_LIMIT_BACKOFF_BASE_MS = 1000;
const STUB_SCORE = 85;
/** Hunter charges 1 credit per finder/verifier/search call. Default cents
 * per credit reflects Starter pricing (~$0.07). Override via constructor. */
const DEFAULT_COST_CENTS_PER_CREDIT = 7;

const PROTOCOL_PREFIX_RE = /^https?:\/\//;
const PATH_SUFFIX_RE = /\/.*$/;
const NON_ALPHA_RE = /[^a-z]/g;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const mapConfidence = (
  score: number | null | undefined,
  status: string | null | undefined
): Confidence => {
  const safeScore = typeof score === "number" ? score : 0;
  const safeStatus = (status ?? "").toLowerCase();
  if (safeStatus === "invalid" || safeStatus === "disposable") {
    return "low";
  }
  if (safeScore >= 90 && safeStatus === "valid") {
    return "high";
  }
  if (safeScore >= 70 && safeStatus !== "invalid") {
    return "medium";
  }
  return "low";
};

const lowercaseDomain = (domain: string): string =>
  domain.trim().toLowerCase().replace(PROTOCOL_PREFIX_RE, "").replace(PATH_SUFFIX_RE, "");

const buildStubEmail = (firstName: string | undefined, domain: string): string => {
  const fn = (firstName ?? "founder").trim().toLowerCase().replace(NON_ALPHA_RE, "");
  return `${fn || "founder"}@${lowercaseDomain(domain)}`;
};

interface HunterRequestParams {
  [key: string]: string | undefined;
}

const buildUrl = (path: string, apiKey: string, params: HunterRequestParams): string => {
  const url = new URL(`${HUNTER_BASE_URL}${path}`);
  url.searchParams.set("api_key", apiKey);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
};

interface FetchOptions {
  timeoutMs: number;
  fetchImpl: typeof fetch;
}

const fetchHunter = async (
  url: string,
  endpoint: string,
  opts: FetchOptions
): Promise<unknown | null> => {
  let attempt = 0;
  let serverErrorAttempts = 0;
  while (attempt <= MAX_RATE_LIMIT_RETRIES) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), opts.timeoutMs);
    let response: Response;
    try {
      response = await opts.fetchImpl(url, { method: "GET", signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
    if (response.status === 401) {
      throw new ProviderAuthError(`Hunter.io rejected the API key (401) on ${endpoint}`);
    }
    if (response.status === 429) {
      attempt += 1;
      if (attempt > MAX_RATE_LIMIT_RETRIES) {
        throw new ProviderRateLimitError(
          `Hunter.io rate limit exceeded on ${endpoint} after ${MAX_RATE_LIMIT_RETRIES} retries`
        );
      }
      const backoff = RATE_LIMIT_BACKOFF_BASE_MS * 2 ** (attempt - 1);
      await sleep(backoff);
      continue;
    }
    if (response.status >= 500) {
      serverErrorAttempts += 1;
      if (serverErrorAttempts > 1) {
        return null;
      }
      await sleep(SERVER_ERROR_RETRY_BASE_MS);
      continue;
    }
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as unknown;
  }
  return null;
};

/** Optional cost logger — caller decides what to do with cost events. */
export type CostLogger = (event: {
  endpoint: "email_finder" | "email_verifier" | "domain_search";
  cost: CostUnit;
  domain?: string | null;
  email?: string | null;
}) => void | Promise<void>;

export interface HunterOptions {
  apiKey?: string;
  /** Cents per Hunter credit; defaults to Starter pricing ~$0.07. */
  costCentsPerCredit?: number;
  /** Max concurrent in-flight requests. */
  concurrency?: number;
  /** Per-request timeout in ms. */
  timeoutMs?: number;
  /** Optional cost logger (per-call). */
  onCost?: CostLogger;
  /** Override fetch (testing). */
  fetchImpl?: typeof fetch;
}

export class HunterEmailProvider implements EmailProvider {
  readonly name = "hunter";
  readonly stub: boolean;

  private readonly apiKey: string | undefined;
  private readonly costCentsPerCredit: number;
  private readonly limit: ReturnType<typeof pLimit>;
  private readonly timeoutMs: number;
  private readonly onCost: CostLogger | undefined;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: HunterOptions = {}) {
    this.apiKey = opts.apiKey;
    this.stub = !this.apiKey;
    this.costCentsPerCredit = opts.costCentsPerCredit ?? DEFAULT_COST_CENTS_PER_CREDIT;
    this.limit = pLimit(opts.concurrency ?? DEFAULT_CONCURRENCY);
    this.timeoutMs = opts.timeoutMs ?? 15_000;
    this.onCost = opts.onCost;
    this.fetchImpl = opts.fetchImpl ?? globalThis.fetch;
  }

  private buildCost(
    endpoint: "email_finder" | "email_verifier" | "domain_search",
    units: number
  ): CostUnit {
    return {
      units,
      costCents: units * this.costCentsPerCredit,
      provider: "hunter",
      endpoint,
    };
  }

  private async logCost(
    endpoint: "email_finder" | "email_verifier" | "domain_search",
    cost: CostUnit,
    extra: { domain?: string | null; email?: string | null }
  ): Promise<void> {
    if (!this.onCost) return;
    try {
      await this.onCost({ endpoint, cost, ...extra });
    } catch {
      // Logger errors must never break the provider.
    }
  }

  findEmail(input: FindEmailInput): Promise<FindEmailResult> {
    return this.limit(async () => {
      const domain = lowercaseDomain(input.domain);

      if (!this.apiKey) {
        const cost = this.buildCost("email_finder", 0);
        const stubEmail = buildStubEmail(input.firstName, domain);
        await this.logCost("email_finder", cost, { domain, email: stubEmail });
        return {
          confidence: "high",
          email: stubEmail,
          score: STUB_SCORE,
          status: "[STUB] valid",
          cost,
          stub: true,
        };
      }

      const url = buildUrl("/email-finder", this.apiKey, {
        domain,
        first_name: input.firstName,
        last_name: input.lastName,
      });
      const json = (await fetchHunter(url, "email-finder", {
        timeoutMs: this.timeoutMs,
        fetchImpl: this.fetchImpl,
      })) as {
        data?: {
          email?: string;
          score?: number;
          verification?: { status?: string };
        };
      } | null;

      const data = json?.data;
      const status = data?.verification?.status ?? "unknown";
      const score = data?.score ?? null;
      const email = data?.email ?? null;
      const confidence = mapConfidence(score, status);
      const cost = this.buildCost("email_finder", 1);
      await this.logCost("email_finder", cost, { domain, email });

      return { confidence, email, score, status, cost, stub: false };
    });
  }

  verifyEmail(input: VerifyEmailInput): Promise<VerifyEmailResult> {
    return this.limit(async () => {
      const email = input.email.trim();
      const domain = email.includes("@") ? (email.split("@")[1] ?? null) : null;

      if (!this.apiKey) {
        const cost = this.buildCost("email_verifier", 0);
        await this.logCost("email_verifier", cost, { domain, email });
        return {
          confidence: "high",
          email,
          score: STUB_SCORE,
          status: "[STUB] valid",
          cost,
          stub: true,
        };
      }

      const url = buildUrl("/email-verifier", this.apiKey, { email });
      const json = (await fetchHunter(url, "email-verifier", {
        timeoutMs: this.timeoutMs,
        fetchImpl: this.fetchImpl,
      })) as {
        data?: {
          score?: number;
          status?: string;
        };
      } | null;

      const data = json?.data;
      const status = data?.status ?? "unknown";
      const score = data?.score ?? null;
      const confidence = mapConfidence(score, status);
      const cost = this.buildCost("email_verifier", 1);
      await this.logCost("email_verifier", cost, { domain, email });

      return { confidence, email, score, status, cost, stub: false };
    });
  }

  searchDomain(input: DomainSearchInput): Promise<DomainSearchResult> {
    return this.limit(async () => {
      const domain = lowercaseDomain(input.domain);

      if (!this.apiKey) {
        const cost = this.buildCost("domain_search", 0);
        const stubEmail = `founder@${domain}`;
        await this.logCost("domain_search", cost, { domain, email: stubEmail });
        return {
          contacts: [
            {
              confidence: "high",
              firstName: "Founder",
              lastName: null,
              position: "Founder",
              score: STUB_SCORE,
              seniority: "executive",
              email: stubEmail,
            },
          ],
          cost,
          stub: true,
        };
      }

      const url = buildUrl("/domain-search", this.apiKey, {
        domain,
        seniority: input.seniority,
        type: input.type,
      });
      const json = (await fetchHunter(url, "domain-search", {
        timeoutMs: this.timeoutMs,
        fetchImpl: this.fetchImpl,
      })) as {
        data?: {
          emails?: Array<{
            confidence?: number;
            first_name?: string | null;
            last_name?: string | null;
            position?: string | null;
            seniority?: string | null;
            value?: string;
          }>;
        };
      } | null;

      const rawEmails = json?.data?.emails ?? [];
      const contacts: DomainSearchContact[] = rawEmails
        .filter((e): e is { value: string } & typeof e => Boolean(e.value))
        .map((e) => ({
          confidence: mapConfidence(e.confidence ?? null, "valid"),
          firstName: e.first_name ?? null,
          lastName: e.last_name ?? null,
          position: e.position ?? null,
          score: e.confidence ?? null,
          seniority: e.seniority ?? null,
          email: e.value,
        }));

      const cost = this.buildCost("domain_search", 1);
      await this.logCost("domain_search", cost, { domain });

      return { contacts, cost, stub: false };
    });
  }
}
