# Roadmap

> Public roadmap for icpfinder. Maintained by hand, intentionally short, sorted by priority. Want something sooner? **React with 👍** on the linked GitHub issue, or [open one](https://github.com/clickspider/icpfinder/issues/new/choose) if it isn't tracked yet. Community votes shape what ships next.
>
> Priority key: **P0** blocker · **P1** next up · **P2** soon · **P3** someday.

## v0.2 — outreach personalization & visibility

### Per-candidate outreach hook generation
**Priority:** P1

For each surfaced candidate, generate a one-line cold-outreach hook grounded in the archetype's pain signals + the candidate's role. Drop-in for Lemlist/Smartlead/Instantly templates. The next-most-asked-for feature after enrichment itself.

### Public-runs feed on `/find` empty state
**Priority:** P2

Show a live feed of recently completed public runs (opt-in at submit time) on the `/find` empty state below the example chips. Social proof + new users see real outputs before committing. Requires opt-in checkbox, moderation pipeline, and identifying-info stripping before public display.

### Share-run URL
**Priority:** P2

`/run/[id]` read-only view of a completed run, with a short shareable link. Enables "look what icpfinder gave me" social sharing. Opt-in at submit time.

### Email export (CSV / JSON)
**Priority:** P2

"Export CSV" and "Export JSON" buttons in the action row after a run completes. Pure client-side, no server round-trip.

### Resume mid-stream run after network drop
**Priority:** P2

If the SSE connection drops mid-run, expose a "Resume?" toast on `/find` with a retry button. Server-side: persist partial run state + chunk offset so the client can pick up where it left off.

### Per-archetype retry
**Priority:** P2

If a single archetype fails enrichment (Hunter timeout, rate limit, partial result), let the user retry just that archetype without restarting the whole run.

## v0.3 — adjacent surfaces

### Post-scanning: find leads from social posts
**Priority:** P3

Flip the discovery direction. Instead of "given a company, find emails," scan recent social posts (Reddit, HN, X, LinkedIn) for buying-signal language matching an archetype's pain and surface posters as lead candidates. Validated demand from early users.

### Cold-email diagnostician
**Priority:** P3

Paste a failing cold-email thread; get a rewritten version grounded in the recipient's archetype. Diagnose tone, framing, and CTA mismatch.

### Cmd+K command palette
**Priority:** P3

Global `Cmd+K` palette (cmdk-style) to jump to `/find`, focus the input, paste an example, view docs, or toggle mode. Lands after `/docs` since the palette without docs has nothing to navigate to.

### `/docs` page
**Priority:** P3

Bespoke docs at `/docs` (MDX). Inherit landing tokens, no custom design. Cover install, BYOK, self-host, API reference, cost model.

### Auto-scroll to newest streaming archetype on mobile
**Priority:** P3

On `<md` viewports, when a new archetype card appends mid-stream, smooth-scroll the page so the streaming card sits at the top of the viewport. Respects `prefers-reduced-motion`.

### Live recorded run in hero
**Priority:** P3

Replace the static code preview with an animated playback of a real recorded `/api/find` SSE stream, commit the JSON, label with seed + date provenance. Lands once we have a deployed production endpoint with a clean public seed worth replaying.

## How voting works

Every roadmap item maps to a GitHub Issue tagged `roadmap`. Sign in to GitHub, open the linked issue, react with 👍. Items with the most 👍 jump priority within their version band. New ideas: [open an issue](https://github.com/clickspider/icpfinder/issues/new/choose) and reference the roadmap if it's an extension.

We don't promise specific dates. Roadmap items can slip, swap, or get cut based on what users actually need.

## Completed

- **Streaming engine + web UI + library + Hunter/Gemini providers + Upstash rate limit** — initial public release. **Completed:** v0.1 (2026-05-26).
- **Brand the README + OSS hygiene + PR CI gate** — README rebrand, CONTRIBUTING, CODE_OF_CONDUCT, issue templates, banner/logo SVGs, CI workflow gating typecheck + test + lint. **Completed:** v0.1 (2026-05-28).
- **Typed errors + inline BYOK + KV run cache + hero video** — typed `ProviderAuth/RateLimit/Quota/NetworkError`, friendly per-code error states, inline BYOK CTA, Vercel KV run cache (sha256 seed, 15-min TTL), hero demo video, Gemini retry tuning. **Completed:** v0.1 (2026-05-27).
- **npm publish pipeline** — `@icpfinder/core` + `@icpfinder/providers` shipping via Changesets + OIDC Trusted Publishing + npm provenance attestations + pkg.pr.new per-PR snapshots. **Completed:** v0.1 (2026-05-27).
- **Vercel Web Analytics on icpfinder.dev** — self-host gets zero tracking, libraries never include tracking. **Completed:** v0.1 (2026-05-28).
- **DCO sign-off requirement** — Developer Certificate of Origin via `probot/dco` enforced on every PR, with inbound = outbound + relicense clause in CONTRIBUTING.md. **Completed:** v0.1 (2026-05-28).
