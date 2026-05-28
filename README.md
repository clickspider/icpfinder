<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset=".github/assets/logo-dark.svg">
    <img alt="icpfinder" src=".github/assets/logo-light.svg" width="140" height="140">
  </picture>
</p>

<h1 align="center">icpfinder</h1>

<p align="center">
  <a href="https://icpfinder.dev">Live demo</a> ·
  <a href="https://www.npmjs.com/package/@icpfinder/core">npm</a> ·
  <a href="./docs/quickstart.md">Docs</a> ·
  <a href="https://github.com/clickspider/icpfinder/discussions">Discussions</a> ·
  <a href="https://github.com/clickspider/icpfinder/issues">Issues</a>
</p>

<p align="center">
  <strong>Find who'll pay for your idea.</strong> Paste a product description, stream 3 ICP archetypes with verified contact emails in 30 seconds. Free. Open source. MIT.
</p>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset=".github/assets/banner-dark.svg">
    <img alt="icpfinder" src=".github/assets/banner-light.svg" width="100%">
  </picture>
</p>

<p align="center">
  <a href="https://github.com/clickspider/icpfinder/actions/workflows/ci.yml"><img src="https://github.com/clickspider/icpfinder/actions/workflows/ci.yml/badge.svg" alt="ci"></a>
  <a href="https://github.com/clickspider/icpfinder/actions/workflows/release.yml"><img src="https://github.com/clickspider/icpfinder/actions/workflows/release.yml/badge.svg" alt="release"></a>
  <a href="https://www.npmjs.com/package/@icpfinder/core"><img src="https://img.shields.io/npm/v/@icpfinder/core?label=%40icpfinder%2Fcore&color=14B8A6" alt="npm core"></a>
  <a href="https://www.npmjs.com/package/@icpfinder/providers"><img src="https://img.shields.io/npm/v/@icpfinder/providers?label=%40icpfinder%2Fproviders&color=14B8A6" alt="npm providers"></a>
  <a href="https://docs.npmjs.com/generating-provenance-statements"><img src="https://img.shields.io/badge/npm-provenance-7C3AED?logo=npm&logoColor=white" alt="provenance"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="license"></a>
  <a href="./CONTRIBUTING.md"><img src="https://img.shields.io/badge/PRs-welcome-F26B3D" alt="PRs welcome"></a>
</p>

<p align="center">
  <a href="https://icpfinder.dev"><img src="https://img.shields.io/badge/▶_Try_the_live_demo-icpfinder.dev-14B8A6?style=for-the-badge&labelColor=15161B" height="36" alt="Try the live demo"></a>
  <a href="https://github.com/clickspider/icpfinder"><img src="https://img.shields.io/badge/★_Star_on_GitHub-7C3AED?style=for-the-badge&labelColor=15161B" height="36" alt="Star on GitHub"></a>
  <a href="https://www.npmjs.com/package/@icpfinder/core"><img src="https://img.shields.io/badge/↓_Install_from_npm-F26B3D?style=for-the-badge&labelColor=15161B" height="36" alt="Install from npm"></a>
</p>

<br/>

<!--
  Demo video: drag-drop `hero-demo.mp4` into a GitHub PR comment to upload it
  to user-attachments, then paste the resulting URL on the next line so GitHub
  renders an inline HTML5 player. Until that's done, the poster JPG below
  serves as the fallback.
-->

<p align="center">
  <a href="https://icpfinder.dev">
    <img src=".github/assets/demo-poster.jpg" alt="icpfinder running a streaming ICP discovery in the browser" width="800">
  </a>
  <br/>
  <sub><a href="https://icpfinder.dev">Watch the live demo with audio →</a></sub>
</p>

<br/>

If you prefer the terminal:

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

## Install

```bash
# core engine + first-party adapters (Gemini + Hunter)
npm i @icpfinder/core @icpfinder/providers
# or
bun add @icpfinder/core @icpfinder/providers
# or
pnpm add @icpfinder/core @icpfinder/providers
```

Both packages ship as ESM + TypeScript-first, with zero side effects on import and [npm provenance attestations](https://docs.npmjs.com/generating-provenance-statements) (built via OIDC Trusted Publishing on GitHub Actions — every published tarball is cryptographically tied to the commit that produced it).

## Quickstart (clone + run)

```bash
git clone https://github.com/clickspider/icpfinder.git
cd icpfinder
bun install
bun run demo                       # zero keys, stub providers
cd packages/web && bun run dev     # full web UI on localhost:3000
```

Full guide: [docs/quickstart.md](./docs/quickstart.md).

## Library usage

```ts
import { IcpFinder } from "@icpfinder/core";
import { GeminiLlmProvider, HunterEmailProvider } from "@icpfinder/providers";

const finder = new IcpFinder({
  llm: new GeminiLlmProvider({ apiKey: process.env.GEMINI_API_KEY! }),
  email: new HunterEmailProvider({ apiKey: process.env.HUNTER_API_KEY! }),
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

## Live demo

<https://icpfinder.dev> — free, IP-capped, no signup. Bring your own keys to remove caps and see real archetypes (or self-host / fork).

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
bun run test       # vitest across providers, core, web
bun run typecheck  # tsc --noEmit across workspaces
bun run lint       # biome
```

PRs are gated on all three via [`.github/workflows/ci.yml`](./.github/workflows/ci.yml). Publishing to npm is automated via [Changesets](https://github.com/changesets/changesets) + OIDC Trusted Publishing — see [CONTRIBUTING.md](./CONTRIBUTING.md#releasing--versioning).

## Roadmap

- **v0.1** — streaming engine + web UI + library + Hunter/Gemini providers + Upstash rate limit ✅
- **v0.2** — outreach personalization (per-candidate hook generation), React Flow visualization, CLI binary, Claude Code skill
- **v0.3** — cold-email diagnostician (paste a failing thread, get rewritten)

## Contributing

PRs, issues, and ideas are all welcome — this project gets better when more eyes find more edges. Whether you're fixing a typo, wiring up a new provider, or asking a question that turns into the next docs page, you belong here.

A few places to start:

- **Good first PR — add a new provider in under 50 lines.** Implement the `LlmProvider` or `EmailProvider` interface in `packages/providers/src/types.ts`, drop tests in `packages/providers/__tests__/`, ship. Apollo, Clearbit, OpenAI, Anthropic, Snov.io — all great candidates.
- **Open an issue.** Bug, idea, half-formed thought — all fine. See the [issue templates](./.github/ISSUE_TEMPLATE).
- **Discussions for design questions** — [GitHub Discussions](https://github.com/clickspider/icpfinder/discussions) is the right place for "should we do X?" before you write code.

Full developer setup, PR conventions, and how Changesets / OIDC publishing work: [CONTRIBUTING.md](./CONTRIBUTING.md). By participating you're agreeing to the [Code of Conduct](./CODE_OF_CONDUCT.md).

## Contributors

Built by people who got tired of paying $400/month for sales tools that should be commodity infrastructure.

<a href="https://github.com/clickspider/icpfinder/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=clickspider/icpfinder" alt="icpfinder contributors" />
</a>

Want your face here? See [Contributing](#contributing) above. ☝️

## License

MIT. Use it. Fork it. Sell it. Don't sue. — See [LICENSE](./LICENSE).

<br/>

<p align="center">
  <sub>Made with ( · ) by <a href="https://github.com/clickspider">Daniel Frey (@clickspider)</a> · <a href="https://icpfinder.dev">icpfinder.dev</a></sub>
</p>
