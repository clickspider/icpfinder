# Business model

icpfinder ships as **MIT-licensed open source**. Self-hosting is free, forever, no asterisks.

The plan, if it ever earns one, is the **CopilotKit shape**: keep the entire codebase MIT, and offer an optional hosted service for people who don't want to run their own infrastructure. The product you `git clone` and the product running at `icpfinder.dev` are the same product. The hosted version sells convenience, not code access.

## Reference projects

This is a well-trodden path. Each of these ships an MIT- or Apache-licensed codebase alongside a paid hosted plan:

- [CopilotKit](https://github.com/CopilotKit/CopilotKit) — MIT framework + Copilot Cloud
- [Resend](https://resend.com) — MIT SDK + hosted email API
- [Inngest](https://github.com/inngest/inngest) — Apache SDK + hosted durable execution
- [Supabase](https://supabase.com) — Apache stack + hosted Postgres
- [Liveblocks](https://liveblocks.io) — MIT client + hosted realtime
- [Tinybird](https://tinybird.co) — open SDK + hosted analytics

## Why MIT instead of AGPL or BSL

We considered three shapes:

| Shape | Self-hosters | Reseller risk | Vibe |
|---|---|---|---|
| **A. MIT + hosted cloud** (our pick) | Free everything | Real but mostly theoretical at our scale | Friendly, low-friction OSS |
| B. AGPL + dual-license | Free, must open-source mods if hosted | Low (viral clause kills resale) | Standard open-core moat |
| C. BSL | Free for non-prod / non-competing | None until conversion | Strongest moat, weakest OSS vibe |

We picked A because:

1. **Market size kills reseller risk.** AWS doesn't fork niche indie B2B tools. The companies that re-host MIT projects target multi-billion-dollar markets (Elasticsearch, MongoDB, Redis). icpfinder is not that.
2. **The moat is operational, not legal.** Managed Hunter and Gemini keys, IP caps, per-run cost aggregation, run cache, dashboards, support. None of that ships in the repo. Cloning the code doesn't clone the service.
3. **MIT minimizes friction.** More contributors, more stars, more inbound. AGPL scares enterprise users; BSL annoys OSS purists. MIT is boring and works.
4. **DCO preserves optionality.** Every contributor signs off via DCO ([DCO.md](../DCO.md)) and agrees to inbound=outbound + future-license relicensing in [CONTRIBUTING.md](../CONTRIBUTING.md). If a hostile fork ever appears, the project can switch to AGPL or BSL without re-asking every contributor.

## Switch triggers

We will revisit the license if **any** of these fire:

1. A well-funded competitor (>$10M ARR or >100k GitHub stars) launches a managed icpfinder fork that competes for the same customers.
2. A premium provider's terms of service require closed-source distribution of their adapter.
3. The hosted plan reaches sustained revenue that justifies the AGPL or BSL friction tradeoff.

Until one of those fires, we stay MIT.

## What's not in this model

- **No closed-source "enterprise" features** in the repo. If we build paid features, they live in a separate commercial app, not behind a license-key check in the public codebase. See [commercial-roadmap.md](./commercial-roadmap.md) for when that split happens.
- **No "core team only" code paths.** Anything that ships in `packages/*` is fully functional for self-hosters. No artificial cripple-ware.
- **No telemetry on self-host.** The marketing site at `icpfinder.dev` uses Vercel Web Analytics. Self-hosters get nothing unless they wire their own. See [telemetry.md](./telemetry.md).

## Last reviewed

2026-05-28
