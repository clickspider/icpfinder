# TODOS

Items grouped by component / skill. Priority P0 (blocker) → P4 (someday). Completed work at the bottom with version tag.

## web — marketing / `/find`

### Public-runs feed on `/find` empty state
**Priority:** P2

Deferred from initial design plan. Show a live feed of recently completed public runs (opt-in at submit time) on the `/find` empty state below the example chips. Adds social proof + helps new users see real outputs before committing.

**Prereqs (blocking):**
- Submit-time opt-in checkbox: "Make this run public — show on the homepage feed."
- Persist `Run.isPublic` flag + content moderation pipeline (classifier or manual queue).
- Privacy review: strip identifying info from seed before public display; allow author redaction.
- Per-IP rate limit + nsfw filter.

**Out of scope until prereqs land.** Without moderation + opt-in, public feed becomes a leak vector.

### shadcn primitives layer
**Priority:** P3

Current approach: token-driven custom components in `components/{brand,marketing,product}/`. Same visual outcome, less ceremony. Revisit if/when:
- A second app/site needs to reuse primitives.
- A contributor wants the established shadcn ergonomics (CLI add, registry, copy-paste pattern).

If we add shadcn: install only `button card input textarea badge dialog tabs tooltip skeleton accordion command` and override every primitive to use the `@theme` tokens. Do not pull defaults.

### `/docs` page
**Priority:** P3

Bespoke docs at `/docs` (MDX). Inherit landing tokens; no custom design. Cover: install, BYOK, self-host, API reference, cost model.

### Cmd+K command palette
**Priority:** P3

Add a global Cmd+K palette (cmdk-style) for: jump to `/find`, focus input, paste an example, view docs, toggle mode. Defer until docs land — palette without docs has nothing to navigate to.

### Email export (CSV / JSON)
**Priority:** P2

After a run completes, "Export CSV" and "Export JSON" buttons in the action row. Pure client-side — no server roundtrip.

### Share-run URL
**Priority:** P2

`/run/[id]` read-only view of a completed run. Generates a short shareable link. Requires `Run.shareSlug` migration + opt-in at submit.

### Auto-scroll to newest streaming archetype on mobile
**Priority:** P3

On `<md` viewports, when a new archetype card appends mid-stream, smooth-scroll the page so the streaming card sits at the top of the viewport. Respect `prefers-reduced-motion`.

## product — `core` + `providers`

### Resume mid-stream run after network drop
**Priority:** P2

If the SSE connection drops mid-run, expose a "Resume?" toast on `/find` with a retry button. Server-side: persist partial run state + chunk offset so client can pick up.

### Per-archetype retry
**Priority:** P3

If one archetype fails mid-stream (Hunter timeout, provider 429), show a coral X status + "Retry this archetype" ghost button in the card foot. Currently the whole run is marked done.

## ops

### Vercel preview deploy badge in README
**Priority:** P4

Auto-attach a preview URL badge to PR body via the existing `/ship` flow.

### Live social proof strip (GitHub stars + npm downloads)
**Priority:** P3

Hero used to render a `SocialProofStrip` RSC that fetched GitHub stargazers + npm weekly downloads and hid when both were 0. Removed in the M1 minimal-hero redesign because hero is now the live demo, not a credibility list. When stars > 50 OR npm weekly > 100 (real signal), reintroduce a thin strip somewhere visible (footer or below the chat input). Rebuild the `/api/social-proof` RSC endpoint with the existing `revalidate: 3600` SWR pattern from git history.

### Live recorded run in hero / Integration
**Priority:** P2

When stars > 0 and we have a deployed production endpoint, record a real `/api/find` SSE stream against a public seed (e.g. "AI invoicing for indie SaaS") and commit the JSON to `packages/web/public/demo-run.json`. Render it as an animated playback alongside `CodePreview` with a `recorded run · YYYY-MM-DD · seed: …` provenance label. Today the hero just shows the SDK code — once we have a real run on the books, the streaming output becomes the visual proof. Do NOT ship synthetic SSE replay with fake emails — provenance is the whole point.

## Completed

- **T1–T10 design implementation** — Luminous Light + Dark tokens, fonts, FOUC bootstrap, `( · )` brand mark, favicon + OG, mode toggle, sticky nav, Hero B split, live GitHub+npm social proof strip, `/find` page with state matrix, a11y baseline, DESIGN.md + CLAUDE.md. **Completed:** v0.1 (2026-05-26).
- **L1–L8 landing redesign** — Dropped marketing-chrome badge pill. Added `NpmInstallLine` with clipboard copy. Replaced fake `DemoCard` with hand-tokenized RSC `CodePreview` showing real `IcpFinder` + `@icpfinder/providers` usage (vitest gate pins snippet to API). Added `Integration` + `FinalCta` sections below hero (3 screens total: Hero → Integration → FinalCta). Footer carries `MIT · v0.1 · PRs welcome` + roadmap link. **Completed:** v0.1 (2026-05-26).
