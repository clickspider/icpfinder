# Costs

icpfinder reports the cost of every provider call in cents. The
default budget caps are conservative; raise them when you trust the
output.

## Cost per run (live providers)

A "run" = one archetype-generation call + N domain-search calls
(one per candidate).

| Component                 | Provider | Default | Cost per call (cents) |
| ------------------------- | -------- | ------- | --------------------- |
| Archetype generation      | Gemini 2.5 Flash | 1 call  | ~0.06¢ per 1k output tokens (typically <0.5¢ total) |
| Candidate domain search   | Hunter   | 5 calls × 3 archetypes = 15 | 7¢ per call (Hunter Starter, 1 credit) |

**Typical run = 105¢ ($1.05).** Most of the cost is Hunter.

If you don't need Hunter contact discovery, swap `FakeEmailProvider`
into `lib/providers.ts` and your per-run cost drops to <1¢.

## Stub mode

When `GEMINI_API_KEY` and `HUNTER_API_KEY` are both unset, icpfinder
uses `FakeLlmProvider` + `FakeEmailProvider`. Every call returns
`{ cost: { costCents: 0 } }`. Use this for development, CI, and demo
videos.

## Budget caps

Three layers, all enforced server-side:

### Per-run

`ICPFINDER_BUDGET_CAP_CENTS` (default `200` = $2.00). The
`IcpFinder.find()` generator stops yielding new candidates the
moment `totalCostCents >= budgetCapCents`. The next event after the
cap is reached is `done`.

### Per-IP daily

`ICPFINDER_DAILY_CAP_CENTS` (default `500` = $5.00).
`ICPFINDER_DAILY_RUNS` (default `20`). Both enforced by
`InMemoryRateLimiter` (single-instance) or `UpstashRateLimiter`
(multi-region). When either hits zero, the API returns `429`.

### Process-wide

There isn't one yet by design. The per-IP daily cap × ~unique IPs
gives you a worst case. Want a hard ceiling? Wrap `getDefaultRateLimiter`
in `lib/rate-limit.ts` with a global counter.

## What gets stored

Every run inserts one `Run` row + N `Event` rows. `Run.totalCostCents`
is the canonical billing record. Query it for usage reports:

```sql
SELECT
  DATE(created_at) AS day,
  COUNT(*) AS runs,
  SUM(total_cost_cents) / 100.0 AS dollars
FROM "Run"
GROUP BY 1
ORDER BY 1 DESC;
```

## Auditing a single run

```ts
const events = await prisma.event.findMany({
  where: { runId },
  orderBy: { createdAt: "asc" },
});
const costEvents = events
  .map((e) => JSON.parse(e.payload))
  .filter((e) => e.type === "cost");
console.log(costEvents);
```

## Pricing references

- Gemini API pricing: <https://ai.google.dev/gemini-api/docs/pricing>
- Hunter pricing: <https://hunter.io/pricing>

Update `DEFAULT_COST_CENTS_PER_1K_OUT_TOKENS` (Gemini provider) and
`DEFAULT_COST_CENTS_PER_CREDIT` (Hunter provider) if either vendor
changes their rates. Tests pin these as known constants — bump them
in lockstep.
