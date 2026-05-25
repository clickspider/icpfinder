// SPDX-License-Identifier: MIT
//
// MonthlyBudget — process-wide kill switch protecting the operator
// from a viral moment. When operator-paid spend in the current UTC
// month exceeds ICPFINDER_MONTHLY_BUDGET_USD, /api/find refuses new
// operator-paid runs with HTTP 402 and prompts the user to BYOK.
//
// Backed by Upstash when available, in-memory otherwise. Cost stored
// as integer cents to avoid float drift.
//
// BYOK runs do NOT consume this budget — the whole point is that
// user keys = $0 to operator.

const COST_SCALE = 100;
const ONE_MONTH_SECONDS = 31 * 24 * 60 * 60;

export interface MonthlyBudget {
  /** Returns the remaining cents in this month. May go negative. */
  remainingCents(): Promise<number>;
  /** Record operator-paid cost incurred. */
  recordCost(cents: number): Promise<void>;
  /** True iff a new operator-paid run is allowed right now. */
  isAvailable(): Promise<boolean>;
}

const monthKey = (): string => new Date().toISOString().slice(0, 7);

export class NoopMonthlyBudget implements MonthlyBudget {
  async remainingCents(): Promise<number> {
    return Number.POSITIVE_INFINITY;
  }
  async recordCost(_cents: number): Promise<void> {}
  async isAvailable(): Promise<boolean> {
    return true;
  }
}

export class InMemoryMonthlyBudget implements MonthlyBudget {
  private spentByMonth = new Map<string, number>();
  constructor(private readonly capCents: number) {}

  async remainingCents(): Promise<number> {
    return this.capCents - (this.spentByMonth.get(monthKey()) ?? 0);
  }
  async recordCost(cents: number): Promise<void> {
    if (cents <= 0) return;
    const k = monthKey();
    this.spentByMonth.set(k, (this.spentByMonth.get(k) ?? 0) + cents);
  }
  async isAvailable(): Promise<boolean> {
    return (await this.remainingCents()) > 0;
  }
}

export interface UpstashMonthlyBudgetOptions {
  url: string;
  token: string;
  capCents: number;
  fetchImpl?: typeof fetch;
}

export class UpstashMonthlyBudget implements MonthlyBudget {
  private readonly url: string;
  private readonly token: string;
  private readonly capCents: number;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: UpstashMonthlyBudgetOptions) {
    this.url = opts.url.replace(/\/+$/, "");
    this.token = opts.token;
    this.capCents = opts.capCents;
    this.fetchImpl = opts.fetchImpl ?? globalThis.fetch;
  }

  private key(): string {
    return `icpf:monthly:${monthKey()}`;
  }

  private async pipeline(commands: Array<Array<string | number>>): Promise<unknown[]> {
    const response = await this.fetchImpl(`${this.url}/pipeline`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify(commands),
    });
    if (!response.ok) {
      throw new Error(`Upstash monthly budget pipeline failed: ${response.status}`);
    }
    return (await response.json()) as unknown[];
  }

  async remainingCents(): Promise<number> {
    const results = await this.pipeline([["GET", this.key()]]);
    const raw = (results[0] as { result: string | null })?.result;
    const scaled = raw == null ? 0 : Number(raw);
    return this.capCents - scaled / COST_SCALE;
  }

  async recordCost(cents: number): Promise<void> {
    if (cents <= 0) return;
    const scaled = Math.round(cents * COST_SCALE);
    await this.pipeline([
      ["INCRBY", this.key(), scaled],
      ["EXPIRE", this.key(), ONE_MONTH_SECONDS],
    ]);
  }

  async isAvailable(): Promise<boolean> {
    return (await this.remainingCents()) > 0;
  }
}

let defaultBudget: MonthlyBudget | null = null;

export const getMonthlyBudget = (): MonthlyBudget => {
  if (defaultBudget) return defaultBudget;
  const capUsd = Number(process.env.ICPFINDER_MONTHLY_BUDGET_USD ?? "");
  if (!Number.isFinite(capUsd) || capUsd <= 0) {
    // No cap configured — operator opted into unlimited spend.
    defaultBudget = new NoopMonthlyBudget();
    return defaultBudget;
  }
  const capCents = capUsd * 100;
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (upstashUrl && upstashToken) {
    defaultBudget = new UpstashMonthlyBudget({ url: upstashUrl, token: upstashToken, capCents });
  } else {
    defaultBudget = new InMemoryMonthlyBudget(capCents);
  }
  return defaultBudget;
};
