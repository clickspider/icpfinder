# icpfinder — agent instructions

## What this repo is

icpfinder is a free, open-source first-customer-discovery tool. Paste a product idea, stream 3 ICP archetypes + verified contact emails in 30 seconds. MIT. No signup wall.

- **Monorepo:** Turbo + Bun. Workspaces under `packages/`.
- **`packages/core`** — provider-agnostic streaming engine (`@icpfinder/core`).
- **`packages/providers`** — Gemini + Hunter adapters.
- **`packages/web`** — Next.js 15 + React 19 app (marketing landing + `/find` run UI + `/api/find` SSE endpoint).

## Design system

**Read [`DESIGN.md`](./DESIGN.md) before any visual change.** It is the canonical source for tokens, components, type, radii, motion, a11y baseline, and slop guardrails. Direction is locked: **Luminous Light + Dark** with mint→iris→coral brand gradient, `( · )` brand mark, rounded everything, aurora glow once per page.

When you change visual code:
1. Open `DESIGN.md` for the token + component reference.
2. Use existing components in `packages/web/components/{brand,marketing,product}/` before inventing new ones.
3. Never invent new colors or radii outside the `@theme` block in `packages/web/app/globals.css`.
4. If you need a new component, add it under the appropriate `components/*` subfolder and update `DESIGN.md`.

## Stack

- Next.js 15 (App Router, RSC where possible)
- React 19
- TypeScript 5.7+
- Tailwind v4 (CSS-first config via `@theme`)
- Prisma 5 (Postgres / Neon)
- Vitest
- Biome (lint + format)
- Bun (package manager + scripts)

## Conventions

- **TypeScript strict** — no `any`. Use `import type` for type-only.
- **No mock data in production.** `DemoCard` on the marketing hero is the only static mock (clearly labeled as a preview).
- **Server components by default.** `"use client"` only when interactive state or browser APIs are needed.
- **Tabular numerics** — wrap any run-id / cost / count in `<span className="tabular">`.
- **A11y baseline** — see `DESIGN.md`. Every page has a skip link. Every interactive element is keyboard-reachable.

## Run

```bash
bun install
bun run dev          # turbo dev across all packages
bun run typecheck    # tsc --noEmit
bun run test         # vitest
bun run build        # next build + prisma generate + prisma migrate deploy
```

## TODOS

See [`TODOS.md`](./TODOS.md) — items organized by component, P0–P4, with a Completed section.

## Reference

- Plan archive: `~/.gstack/projects/clickspider-icpfinder/`
- Visual reference HTMLs: `~/.gstack/projects/clickspider-icpfinder/designs/design-system-20260525-225246/`
  - `hero-study-light-v2.html` — Hero A vs B reference (B locked)
  - `brand-mark.html` — `( · )` scale + lockups
  - `preview-luminous.html` — full dark Luminous system preview
