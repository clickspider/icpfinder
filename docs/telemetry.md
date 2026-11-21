# Telemetry

## TL;DR

| Where | Tracking? |
|---|---|
| `icpfinder.dev` (the hosted marketing site) | Yes — Vercel Web Analytics. No cookies. No PII storage. On `/next` also PostHog: cookies and session replay only after Accept. |
| Self-host (anything you run locally or on a non-Vercel host) | **No.** Zero tracking. Zero network calls to any analytics endpoint. |
| `bun run demo` (CLI) | **No.** |
| `@icpfinder/core`, `@icpfinder/providers` (npm libs) | **No, and never.** Libraries never phone home. |

## What we collect on icpfinder.dev

The hosted marketing site uses [Vercel Web Analytics](https://vercel.com/docs/analytics). Per [Vercel's privacy policy](https://vercel.com/docs/analytics/privacy-policy):

- **No cookies.** No browser storage.
- **No PII storage.** IP address + User-Agent are hashed into a daily-rotating visitor ID server-side and discarded.
- **Country-level geo** (derived from IP at request time, not stored).
- **Page URL** (path + query string) and **referrer header**.

### Custom funnel events

`packages/web/lib/use-icp-run.ts` sends a few named events so we can see where runs drop off. They carry counts and enums only. They never carry your product description, URL, keys, companies or contacts.

| Event | Properties |
|---|---|
| `run_started` | `byok` (true/false), `input` (`url` or `text`) |
| `run_done` | `archetypes` (count) |
| `run_error` | `code` (error code enum) |
| `contacts_requested`, `more_contacts`, `deepen`, `outreach_copied` | none |

Like page views, these are no-ops off Vercel.

### PostHog on `/next` (the beta page)

`packages/web/lib/posthog.ts` sends funnel events from `/next` only, to PostHog EU, and only when `NEXT_PUBLIC_POSTHOG_KEY` is set (self-hosters: unset, so zero calls and no consent bar). No person profiles. Events never carry form answers, names or email addresses. PostHog autocapture also records clicks (input values are masked).

`/next` asks once, with a small bar (Decline / Accept, same weight), whether we may use cookies and session replay. The bar comes after the visitor scrolls past the hero and hides while the sign-up form is on screen. The answer is kept in `localStorage` as `icpf_consent` (`yes` / `no`). A privacy note under the footer explains it and has a "Change your choice" button.

| Choice | What PostHog does |
|---|---|
| None yet, or Decline | Memory persistence: no cookies, no browser storage by PostHog. No session replay. |
| Accept | `localStorage+cookie` persistence (a `ph_*` cookie and localStorage entry, so return visits are recognised) and session replay. Replay masks every input, textarea and select (`maskAllInputs: true`), so nothing typed into the form is recorded. |
| Decline after Accept | Replay stops, persistence goes back to memory; the `ph_*` cookie and localStorage entry are removed. |

Every event carries a `consent` property (`yes`, `no` or `none`).

| Event | Properties |
|---|---|
| `consent` | `choice` (`accept` or `decline`) |
| `next_view` | `cta` (`film` or `pain`) |
| `film_half`, `film_end` | `sound` (true/false) |
| `film_sound_on`, `form_start` | none |
| `book_click` | `where` (`hero`, `form`, `thanks`) |
| `form_submit` | `tools` (count) |
| `form_error` | `status` (HTTP status) |

What this means practically:

- We can see "X people visited `/find`" and "Y people came from Hacker News."
- We cannot see who you are or what your IP address is. We correlate visits across days only on `/next`, and only after you accept cookies.
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
- **PostHog only on `/next`.** Nowhere else on the site, and cookies or session replay only after the visitor accepts.

## Reporting

Found a tracking call we shouldn't be making? Open an issue with the file and line. We'll treat it as a privacy bug.
