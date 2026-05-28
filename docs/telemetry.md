# Telemetry

## TL;DR

| Where | Tracking? |
|---|---|
| `icpfinder.dev` (the hosted marketing site) | Yes — Vercel Web Analytics. No cookies. No PII storage. |
| Self-host (anything you run locally or on a non-Vercel host) | **No.** Zero tracking. Zero network calls to any analytics endpoint. |
| `bun run demo` (CLI) | **No.** |
| `@icpfinder/core`, `@icpfinder/providers` (npm libs) | **No, and never.** Libraries never phone home. |

## What we collect on icpfinder.dev

The hosted marketing site uses [Vercel Web Analytics](https://vercel.com/docs/analytics). Per [Vercel's privacy policy](https://vercel.com/docs/analytics/privacy-policy):

- **No cookies.** No browser storage.
- **No PII storage.** IP address + User-Agent are hashed into a daily-rotating visitor ID server-side and discarded.
- **Country-level geo** (derived from IP at request time, not stored).
- **Page URL** (path + query string) and **referrer header**.

What this means practically:

- We can see "X people visited `/find`" and "Y people came from Hacker News."
- We cannot see who you are, what your IP address is, or correlate visits across days.
- We do not run cross-site trackers, ad networks, or third-party analytics.

## Privacy posture: no PII in URLs

We deliberately do not put user input into query strings on icpfinder.dev. The `/find` endpoint is POST-only — your product description never appears in a URL. If you fork the site and add query-string-driven UI later, audit whether anything sensitive ends up in URLs before deploying, since Vercel Analytics will record full paths.

## Self-host gets zero telemetry

`@vercel/analytics` short-circuits when `process.env.VERCEL_ENV` is unset. If you clone this repo and run it on Fly, Render, Railway, Coolify, a Raspberry Pi, or anywhere that isn't Vercel — the `<Analytics />` component renders nothing and makes no network calls.

You can verify this:

```bash
git clone https://github.com/clickspider/icpfinder.git
cd icpfinder
bun install
cd packages/web && bun run dev
# Open http://localhost:3000 in a browser
# Open DevTools → Network tab
# Filter for "vercel" — zero requests
```

The relevant guard lives in `packages/web/app/layout.tsx` (commented). The `@vercel/analytics` package version is pinned exactly (no `^`) because the no-fire contract depends on version-specific behavior — bumping it requires re-verifying.

## What we will not do

- **No telemetry in the npm libs.** `@icpfinder/core` and `@icpfinder/providers` are pure libraries. They will never phone home. Period.
- **No optional-but-default-on tracking.** Tracking is opt-in by deploying to Vercel with analytics enabled. There is no env var you can flip to enable phone-home behavior in self-host. If you want analytics on your fork, you wire it yourself.
- **No third-party trackers on icpfinder.dev.** No Google Analytics, no Segment, no Hotjar, no FullStory. Just Vercel's first-party Web Analytics.
- **No PostHog (yet).** We may reconsider at 1k+ weekly uniques if a real funnel question comes up that Vercel Analytics can't answer. Until then, signal isn't worth the dependency.

## Reporting

Found a tracking call we shouldn't be making? Open an issue with the file and line. We'll treat it as a privacy bug.
