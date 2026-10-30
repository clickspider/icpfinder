// SPDX-License-Identifier: MIT
//
// ContextDevPeopleSearch — natural-language people search via Context.dev.
// Docs: https://docs.context.dev/api-reference/people/search
//
// One call = up to 10 people, most relevant first. `fast` costs 10 credits,
// `ultra` (judges every candidate against every criterion) costs 50. Searches
// with no matches are free. The key comes from the constructor or the
// CONTEXT_DEV_API_KEY env var; it is never logged or put in a URL.

import {
  type CostUnit,
  ProviderAuthError,
  ProviderNetworkError,
  ProviderQuotaError,
  ProviderRateLimitError,
} from "./types";

const CONTEXT_DEV_URL = "https://api.context.dev/v1/people/search";
const MAX_RATE_LIMIT_RETRIES = 2;
const DEFAULT_RETRY_AFTER_S = 2;
const FAST_QUERY_MAX = 500;
const ULTRA_QUERY_MAX = 5000;
const COUNTRY_RE = /^[A-Z]{2}$/;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export type PeopleSearchMode = "fast" | "ultra";

export interface PeopleSearchFilters {
  /** ISO 3166-1 alpha-2 codes for where people live, e.g. ["US", "NL"]. */
  countries?: string[];
  yearsOfExperienceMin?: number;
  yearsOfExperienceMax?: number;
}

export interface PeopleSearchInput {
  /** Plain-language description of who to find. Max 500 chars (fast) / 5000 (ultra). */
  query: string;
  mode?: PeopleSearchMode;
  filters?: PeopleSearchFilters;
  /** `nextCursor` from a previous call with the same query, mode and filters. */
  cursor?: string;
  /** Dashboard usage tags (max 20, each 1-50 chars). */
  tags?: string[];
}

export interface Person {
  name: string | null;
  description: string | null;
  /** Public professional profile URLs. */
  profiles: string[];
  location: { countryCode: string | null; region: string | null; city: string | null };
  role: {
    title: string | null;
    seniority: string | null;
    functions: string[];
    startedOn: string | null;
    company: { name: string | null; domain: string | null } | null;
  };
  yearsOfExperience: number | null;
  isFounder: boolean | null;
  skills: string[];
  schools: string[];
  /** 0-1, only returned in `ultra` mode. */
  matchConfidence: number | null;
}

export interface PeopleSearchResult {
  people: Person[];
  nextCursor: string | null;
  requestId: string | null;
  creditsRemaining: number | null;
  cost: CostUnit;
}

export type PeopleSearchCostLogger = (event: {
  mode: PeopleSearchMode;
  cost: CostUnit;
  results: number;
}) => void | Promise<void>;

export interface ContextDevOptions {
  /** Defaults to process.env.CONTEXT_DEV_API_KEY. */
  apiKey?: string;
  /** Cents per Context.dev credit for your plan. Default 0 (units are still reported). */
  costCentsPerCredit?: number;
  /** Per-request timeout. Defaults: 20 s fast, 45 s ultra (ultra can take ~30 s). */
  timeoutMs?: number;
  onCost?: PeopleSearchCostLogger;
  /** Override fetch (testing). */
  fetchImpl?: typeof fetch;
  /** Multiplier on Retry-After seconds. Tests set 0. */
  retryAfterScaleMs?: number;
}

interface RawPerson {
  name?: string | null;
  description?: string | null;
  profiles?: string[] | null;
  location?: { country_code?: string | null; region?: string | null; city?: string | null } | null;
  role?: {
    title?: string | null;
    seniority?: string | null;
    functions?: string[] | null;
    started_on?: string | null;
    company?: { name?: string | null; domain?: string | null } | null;
  } | null;
  years_of_experience?: number | null;
  is_founder?: boolean | null;
  skills?: string[] | null;
  schools?: string[] | null;
  match?: { confidence?: number | null } | null;
}

interface RawResponse {
  results?: RawPerson[];
  next_cursor?: string | null;
  request_id?: string;
  key_metadata?: { credits_consumed?: number; credits_remaining?: number };
  message?: string;
  error_code?: string;
  error_data?: { should_retry?: boolean; retry_after_seconds?: number };
}

const mapPerson = (p: RawPerson): Person => ({
  name: p.name ?? null,
  description: p.description ?? null,
  profiles: p.profiles ?? [],
  location: {
    countryCode: p.location?.country_code ?? null,
    region: p.location?.region ?? null,
    city: p.location?.city ?? null,
  },
  role: {
    title: p.role?.title ?? null,
    seniority: p.role?.seniority ?? null,
    functions: p.role?.functions ?? [],
    startedOn: p.role?.started_on ?? null,
    company: p.role?.company
      ? { name: p.role.company.name ?? null, domain: p.role.company.domain ?? null }
      : null,
  },
  yearsOfExperience: p.years_of_experience ?? null,
  isFounder: p.is_founder ?? null,
  skills: p.skills ?? [],
  schools: p.schools ?? [],
  matchConfidence: p.match?.confidence ?? null,
});

const buildBody = (input: PeopleSearchInput, mode: PeopleSearchMode): Record<string, unknown> => {
  const query = input.query.trim();
  const max = mode === "ultra" ? ULTRA_QUERY_MAX : FAST_QUERY_MAX;
  if (!query) throw new RangeError("Context.dev people search: query is empty");
  if (query.length > max) {
    throw new RangeError(`Context.dev people search: query is over ${max} chars for ${mode} mode`);
  }
  const body: Record<string, unknown> = { query, mode };
  const f = input.filters;
  if (f) {
    const filters: Record<string, unknown> = {};
    if (f.countries?.length) {
      const countries = f.countries.map((c) => c.trim().toUpperCase());
      const bad = countries.find((c) => !COUNTRY_RE.test(c));
      if (bad) throw new RangeError(`Context.dev people search: bad country code "${bad}"`);
      filters.countries = countries;
    }
    if (f.yearsOfExperienceMin !== undefined)
      filters.years_of_experience_min = f.yearsOfExperienceMin;
    if (f.yearsOfExperienceMax !== undefined)
      filters.years_of_experience_max = f.yearsOfExperienceMax;
    if (Object.keys(filters).length) body.filters = filters;
  }
  if (input.cursor) body.cursor = input.cursor;
  if (input.tags?.length) body.tags = input.tags;
  return body;
};

const readJson = async (response: Response): Promise<RawResponse> => {
  try {
    return (await response.json()) as RawResponse;
  } catch {
    return {};
  }
};

export class ContextDevPeopleSearch {
  readonly name = "context-dev";

  private readonly apiKey: string | undefined;
  private readonly costCentsPerCredit: number;
  private readonly timeoutMs: number | undefined;
  private readonly onCost: PeopleSearchCostLogger | undefined;
  private readonly fetchImpl: typeof fetch;
  private readonly retryAfterScaleMs: number;

  constructor(opts: ContextDevOptions = {}) {
    this.apiKey = (opts.apiKey ?? process.env.CONTEXT_DEV_API_KEY)?.trim() || undefined;
    this.costCentsPerCredit = opts.costCentsPerCredit ?? 0;
    this.timeoutMs = opts.timeoutMs;
    this.onCost = opts.onCost;
    this.fetchImpl = opts.fetchImpl ?? globalThis.fetch;
    this.retryAfterScaleMs = opts.retryAfterScaleMs ?? 1000;
  }

  /** True when a key is configured. */
  get configured(): boolean {
    return Boolean(this.apiKey);
  }

  async search(input: PeopleSearchInput): Promise<PeopleSearchResult> {
    if (!this.apiKey) {
      throw new ProviderAuthError(
        "Context.dev API key missing: set CONTEXT_DEV_API_KEY or pass apiKey",
        "context-dev"
      );
    }
    const mode = input.mode ?? "fast";
    const body = JSON.stringify(buildBody(input, mode));
    const timeoutMs = this.timeoutMs ?? (mode === "ultra" ? 45_000 : 20_000);

    for (let attempt = 0; ; attempt += 1) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      let response: Response;
      try {
        response = await this.fetchImpl(CONTEXT_DEV_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body,
          signal: controller.signal,
        });
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          throw new ProviderNetworkError(
            `Context.dev people search timed out after ${timeoutMs}ms`,
            "context-dev"
          );
        }
        throw new ProviderNetworkError(
          `Network error reaching Context.dev: ${err instanceof Error ? err.message : String(err)}`,
          "context-dev"
        );
      } finally {
        clearTimeout(timeoutId);
      }

      const json = await readJson(response);
      const detail = `${json.error_code ?? response.status}${json.message ? `: ${json.message}` : ""}`;

      if (response.status === 429) {
        const retryAfter =
          json.error_data?.retry_after_seconds ??
          Number(response.headers.get("retry-after") || DEFAULT_RETRY_AFTER_S);
        if (json.error_data?.should_retry === false || attempt >= MAX_RATE_LIMIT_RETRIES) {
          throw new ProviderRateLimitError(`Context.dev rate limited (${detail})`, "context-dev");
        }
        await sleep(retryAfter * this.retryAfterScaleMs);
        continue;
      }
      if (response.status === 401 || response.status === 403) {
        throw new ProviderAuthError(`Context.dev rejected the API key (${detail})`, "context-dev");
      }
      if (json.error_code === "USAGE_EXCEEDED" || response.status === 402) {
        throw new ProviderQuotaError(`Context.dev credits used up (${detail})`, "context-dev");
      }
      if (!response.ok) {
        throw new ProviderNetworkError(
          `Context.dev people search failed (${detail})`,
          "context-dev"
        );
      }

      const people = (json.results ?? []).map(mapPerson);
      const credits = json.key_metadata?.credits_consumed ?? 0;
      const cost: CostUnit = {
        units: credits,
        costCents: credits * this.costCentsPerCredit,
        provider: "context-dev",
        endpoint: `people_search_${mode}`,
      };
      if (this.onCost) {
        try {
          await this.onCost({ mode, cost, results: people.length });
        } catch {
          // Logger errors must never break the provider.
        }
      }
      return {
        people,
        nextCursor: json.next_cursor ?? null,
        requestId: json.request_id ?? response.headers.get("x-request-id"),
        creditsRemaining: json.key_metadata?.credits_remaining ?? null,
        cost,
      };
    }
  }
}
