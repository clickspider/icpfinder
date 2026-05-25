# Quickstart

Get icpfinder running locally in under 5 minutes.

## Prerequisites

- [Bun](https://bun.sh) 1.3+
- Node 20+
- Git

## 1. Clone + install

```bash
git clone https://github.com/clickspider/icpfinder.git
cd icpfinder
bun install
```

That's it for setup. No API keys, no database, no Docker.

## 2. Try the CLI demo (zero config)

```bash
bun run demo
```

Streams three ICP archetypes + nine fake candidates to stdout using
the `FakeLlmProvider` + `FakeEmailProvider`. Good first signal that the
monorepo is wired up correctly.

Pass your own seed:

```bash
bun run demo "AI-assisted SOC 2 prep tool for seed-stage B2B SaaS"
```

## 3. Run the web app

```bash
cd packages/web
cp .env.example .env
bun run db:push     # creates packages/web/prisma/dev.db
bun run dev
```

Open <http://localhost:3000>. Paste a product description, hit **Find
my ICPs**, watch archetypes + candidates stream in.

Still no API keys — the app boots in stub mode (clearly labelled in
results: every candidate is named Sarah Chen).

## 4. Switch to live providers

Add to `packages/web/.env`:

```bash
GEMINI_API_KEY=AI...        # from https://aistudio.google.com/app/apikey
HUNTER_API_KEY=...          # from https://hunter.io/api-keys
```

Restart the dev server. Same UI, real archetypes, real verified emails.

See [costs.md](./costs.md) for what each run costs in cents and how to
cap spend per-run + per-day.

## 5. Run the tests

```bash
bun run test       # 80+ tests across providers, core, web
bun run typecheck
bun run lint
```

## What next

- [self-host.md](./self-host.md) — deploy your own copy to Vercel
- [costs.md](./costs.md) — billing model + budget caps
- [troubleshooting.md](./troubleshooting.md) — common failures
