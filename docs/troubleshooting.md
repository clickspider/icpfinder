# Troubleshooting

## The web app returns `429 Daily rate limit reached`

Your IP hit `ICPFINDER_DAILY_CAP_CENTS` or `ICPFINDER_DAILY_RUNS`.

- Local dev: restart the dev server (resets the in-memory bucket).
- Production: wait until UTC midnight, or raise the caps.

## Every candidate is named "Sarah Chen"

You're in stub mode. Set `GEMINI_API_KEY` + `HUNTER_API_KEY` and
restart. Both providers detect the env at construction time, so a
restart is required.

## `ProviderAuthError: Gemini rejected the API key`

Bad/expired key. Get a fresh one at
<https://aistudio.google.com/app/apikey>. The key must have the
Generative Language API enabled (it does by default in AI Studio).

## `ProviderAuthError: Hunter.io rejected the API key`

Bad/expired key. Regenerate at <https://hunter.io/api-keys>. Check
your Hunter dashboard to make sure you haven't hit the monthly credit
ceiling (the API returns 401 in that state).

## `ProviderRateLimitError: ... exceeded after 3 retries`

The provider's own rate limit, not icpfinder's. The default backoff
is 1s/2s/4s. If you hit this often:

- Lower `candidatesPerArchetype` (default 5) so fewer Hunter calls fire
- Upgrade your Hunter plan
- For Gemini: switch from Flash to Pro, or apply for a quota raise

## `safeFetch` blocked a URL I trust

By design. `safeFetch` refuses any host that resolves to an internal
IP (RFC1918, loopback, link-local, cloud metadata). If you have a
legitimate internal hostname that should be reachable, instantiate
`safeFetch` directly with a custom `resolveHost` that allow-lists it
— don't loosen the global block list.

If you're seeing this for a public URL, check your DNS — your
resolver might be returning a private IP for an unrelated reason
(corporate split-horizon DNS, captive portal).

## SSE stream cuts out after 10s

Some reverse proxies buffer or terminate idle SSE connections. The
route handler emits a `: ping` heartbeat every 15s by default to keep
the connection alive. If your proxy has a shorter idle timeout, lower
`heartbeatMs` in `app/api/find/route.ts`.

Cloudflare proxied requests can also buffer — set `x-accel-buffering:
no` (already present) and disable Cloudflare's "Rocket Loader" on the
route.

## `Module not found: Can't resolve './archetypes.js'`

You hit a known Bundler-mode mismatch. The repo has been migrated to
extension-less imports (`./archetypes` not `./archetypes.js`). If you
see this error in a fork, run:

```bash
find packages -type f -name "*.ts" -exec sed -i '' -E 's|from "(\./[^"]+)\.js"|from "\1"|g' {} +
```

then re-run `bun install`.

## Prisma client out of sync after pulling main

```bash
cd packages/web
bunx prisma generate
```

The `postinstall` hook does this automatically on `bun install`. If
you skipped install (e.g. workspace-level rebuild), regenerate
manually.

## `bun run demo` exits 0 instantly with no output

You're not actually running it — make sure you're at the repo root,
not inside `packages/`. The script lives at `scripts/demo.ts`.

## Tests pass locally but Vercel build fails

Most common cause: `transpilePackages` mismatch. The web app declares
`@icpfinder/core` + `@icpfinder/providers` in `next.config.mjs`. If
you add a new internal package, add it there too.

## How do I report a bug?

<https://github.com/clickspider/icpfinder/issues>. Include:

- Run ID (printed in the first `cost` SSE frame, format `run:<cuid>`)
- The Run row dump: `SELECT * FROM "Run" WHERE id = '<id>';`
- The Event rows for that run

We'll have full reproduction without you sharing your seed text.
