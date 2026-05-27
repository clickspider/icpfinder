# icpfinder

> Free, open-source first-customer-discovery tool for indie AI builders. Paste your idea, stream three ICP archetypes + lookalike companies with verified contact emails. MIT.

[![tests](https://img.shields.io/badge/tests-80%2F80-brightgreen)](https://github.com/clickspider/icpfinder)
[![license](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![status](https://img.shields.io/badge/status-v0.1%20alpha-orange)](#)

```
$ bun run demo

icpfinder demo
seed: AI invoicing tool for indie SaaS founders ...

# 1. Principal Designer
   Boutique Brand Identity Studios · 1-5 employees
   Losing hours weekly on subjective client feedback ...
   signals: Recent posts on X complaining about revision creep ...
   → sarah.chen@…
   → marcus.reed@…

done · 3 archetypes · 9 candidates · 0.00 ¢
```

## What it does

1. **Archetype detection.** Your product description → 3 ICP archetypes (industry, role, pain, buying signals) via Gemini 2.5 Flash with optional Google grounding.
2. **Candidate enrichment.** Each archetype → N lookalike companies + verified decision-maker emails via Hunter.io.
3. **Streaming + cost-capped.** Async-generator API. Every provider call reports cents consumed. Per-run + per-IP caps enforced server-side.

Everything is swappable. The core engine depends only on `LlmProvider` and `EmailProvider` interfaces — drop in Apollo, Clearbit, OpenAI, Anthropic without touching `packages/core`.

## Quickstart

```bash
git clone https://github.com/clickspider/icpfinder.git
cd icpfinder
bun install
bun run demo                       # zero keys, stub providers
cd packages/web && bun run dev     # full web UI
```

Full guide: [docs/quickstart.md](./docs/quickstart.md).

## Hosted demo

<https://icpfinder.dev> — free, IP-capped, no signup. Bring your own keys to remove caps + see real archetypes (self-host or fork).

## Library usage

```ts
import { IcpFinder } from "@icpfinder/core";
import { GeminiLlmProvider, HunterEmailProvider } from "@icpfinder/providers";

const finder = new IcpFinder({
  llm: new GeminiLlmProvider({ apiKey: process.env.GEMINI_API_KEY }),
  email: new HunterEmailProvider({ apiKey: process.env.HUNTER_API_KEY }),
});

for await (const event of finder.find({
  seed: "AI tool that helps freelance designers handle client revisions",
  archetypeLimit: 3,
  candidatesPerArchetype: 5,
  budgetCapCents: 200,
})) {
  console.log(event);
  // { type: "archetype", archetype: {...} }
  // { type: "candidate", candidate: {...} }
  // { type: "cost",      cost: { costCents, provider, endpoint } }
  // { type: "done",      totalCostCents }
}
```

Both packages publish as ESM, TypeScript-first, zero side effects on import.

## Architecture

```
packages/
├── providers/   EmailProvider + LlmProvider interfaces
│                  → HunterEmailProvider, GeminiLlmProvider, Fake*
├── core/        IcpFinder orchestrator + safeFetch (SSRF-hardened)
│                  → async-generator API, cost reporting, budget caps
└── web/         Next.js 15 app
                   → POST /api/find (text/event-stream)
                   → Prisma (Run + Event persistence)
                   → InMemory or Upstash rate limit (per-IP)
```

The dependency graph is strictly acyclic: `web → core → providers`.

## Costs

Stub mode: free, no keys. Live mode: ~$1.05 per run (mostly Hunter). Cap with `ICPFINDER_BUDGET_CAP_CENTS` + `ICPFINDER_DAILY_CAP_CENTS`. Full breakdown: [docs/costs.md](./docs/costs.md).

## Run cache (optional)

In operator mode, the `/api/find` endpoint can cache complete SSE event streams in Vercel KV (Upstash Redis), keyed by `sha256(seed)` with a 15-minute TTL. Duplicate seeds replay instantly with zero Gemini calls — useful when the shared free-tier key keeps hitting rate limits. To enable, set:

```bash
KV_REST_API_URL=…
KV_REST_API_TOKEN=…
```

Unset → cache is a graceful no-op (every request goes live). BYOK runs always bypass the cache so user data stays user-side.

## Self-host

Vercel + Postgres + Upstash, three steps: [docs/self-host.md](./docs/self-host.md).

## Tests

```bash
bun run test       # 80 tests across providers, core, web
bun run typecheck
bun run lint
```

## Roadmap

- **v0.1** — streaming engine + web UI + library + Hunter/Gemini providers + Upstash rate limit ✅
- **v0.2** — outreach personalization (per-candidate hook generation), React Flow visualization, CLI binary, Claude Code skill
- **v0.3** — cold-email diagnostician (paste a failing thread, get rewritten)

## Contributing

Issues, PRs, ideas — all welcome. Add a new provider in <50 lines: implement the interface in `packages/providers/src/types.ts`, drop tests in `packages/providers/__tests__/`, ship.

## License

MIT. Use it. Fork it. Sell it. Don't sue.
