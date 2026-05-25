# Self-host

Deploy your own icpfinder. MIT — fork it, brand it, ship it. The
hosted version at <https://icpfinder.dev> exists so you don't have to.

## Vercel (recommended)

icpfinder targets the standard Vercel + Postgres + Upstash stack.
A clean deploy is three steps.

### 1. Fork + import

1. Fork <https://github.com/clickspider/icpfinder>.
2. <https://vercel.com/new> → import the fork.
3. Set **Root Directory** to `packages/web`.
4. Framework preset: Next.js (auto-detected). Build command: leave default.

### 2. Provision storage

You need:

- A Postgres database (Neon, Supabase, Vercel Postgres — anything)
- An Upstash Redis (for rate limiting across regions)

Both have generous free tiers; combined cost is **$0/mo** at low
volume.

Add to your Vercel project's env vars (Settings → Environment Variables):

```bash
DATABASE_URL=postgres://...
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...

GEMINI_API_KEY=AI...
HUNTER_API_KEY=...

ICPFINDER_BUDGET_CAP_CENTS=200     # per-run hard cap
ICPFINDER_DAILY_CAP_CENTS=500      # per-IP daily cap
ICPFINDER_DAILY_RUNS=20            # per-IP daily run count
ICPFINDER_IP_SALT=<random-32-bytes-hex>
```

### 3. Switch Prisma to Postgres

In `packages/web/prisma/schema.prisma` change:

```prisma
datasource db {
  provider = "postgresql"   # was: sqlite
  url      = env("DATABASE_URL")
}
```

Then locally:

```bash
cd packages/web
bunx prisma migrate dev --name init
git add prisma/migrations
git commit -m "feat: postgres migrations"
git push
```

Vercel's build command runs `prisma generate` (via `postinstall`).
The first deploy will create the tables on first request when you
add `prisma migrate deploy` to the build (or run it once manually
against the prod DB).

### 4. Add your domain (optional)

Vercel project → Settings → Domains → add `icpfinder.yourname.com`
and the matching `www.` subdomain. Vercel will issue the TLS cert.

## Other platforms

The web app is plain Next.js 15 + Node 20, no Vercel-specific APIs.
It runs anywhere that supports Node + a Postgres connection:

- **Fly.io** — drop a `Dockerfile`, point at your Neon DB
- **Railway** — connect the repo, set `Root Directory` to `packages/web`
- **Render** — same idea, web service + managed Postgres
- **Self-host on a VPS** — `bun run build` + `bun run start` behind nginx

Rate limiting falls back to in-memory if Upstash env vars are unset.
Fine for single-instance deploys; multi-region requires Upstash (or
swap in another `RateLimiter` implementation — the interface lives at
`packages/web/lib/rate-limit.ts`).

## Build-from-source as a library

If you only want the core engine (no Next.js, no DB, no rate limit):

```bash
bun add @icpfinder/core @icpfinder/providers
```

```ts
import { IcpFinder } from "@icpfinder/core";
import { GeminiLlmProvider, HunterEmailProvider } from "@icpfinder/providers";

const finder = new IcpFinder({
  llm: new GeminiLlmProvider({ apiKey: process.env.GEMINI_API_KEY }),
  email: new HunterEmailProvider({ apiKey: process.env.HUNTER_API_KEY }),
});

for await (const event of finder.find({ seed: "my product" })) {
  console.log(event);
}
```

Both packages are published as ESM, TypeScript-first, zero side
effects on import.
