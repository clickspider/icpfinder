# icpfinder.dev — Design System

**Direction:** Luminous Light + Dark. Warm cream paper + mint→iris brand gradient + warm coral punch + rounded everything + soft aurora glow backdrop. Engineer-trustable, inviting, anti-template.

This file is the canonical design source of truth for the web app. Every visual decision starts here. If something in code disagrees with this file, fix the code (or update this file via a deliberate PR).

## Aesthetic principles

1. **Light default.** Honor `prefers-color-scheme` on first visit; persist manual choice in `localStorage('icpfinder.mode')`.
2. **Round everything.** No hard rectangles. Cards 14px, panels 20px, demo frame 28px, buttons + chips full pill.
3. **One aurora per page.** Hero only. No other section gets a glow backdrop.
4. **One gradient text accent per page.** `h1` on marketing; the gradient `find` word on `/find`. Section headers stay solid `--text`.
5. **Gradient fills only on:** primary CTA, progress bar, brand mark accents. Never gradient borders, gradient backgrounds, gradient icons.
6. **No fake social proof.** Live GitHub stars + live npm downloads. Empty → hide the strip, never beg.
7. **No macOS traffic-light dots.** Demo card header carries run-id + streaming pulse + cost. That's the content.
8. **No emoji in marketing copy.** Real Unicode glyphs sparingly (→ ✓ • ★) and only when semantic.
9. **No 3-col SaaS feature grid with icons in circles.** Use a horizontal text strip with mint pulse dots or a checklist.
10. **No decorative floating SVG shapes.** Aurora is the only ornament.

## Color tokens

Defined in `packages/web/app/globals.css` inside the `@theme` block. Available as both `--color-<name>` (theme reference) and `--<name>` (instance alias that flips with `data-mode`).

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--bg` | `#F7F5F0` | `#0F1014` | Page surface |
| `--bg-elev` | `#FFFFFF` | `#181A21` | Elevated panels, inputs, demo card |
| `--bg-card` | `#FFFFFF` | `#1E2029` | Cards |
| `--bg-card-hi` | `#FAF8F2` | `#262835` | Hover / nested surfaces |
| `--hairline` | `rgba(15,16,20,0.08)` | `rgba(255,255,255,0.06)` | Quiet borders |
| `--hairline-2` | `rgba(15,16,20,0.16)` | `rgba(255,255,255,0.10)` | Medium borders, focus rests |
| `--text` | `#15161B` | `#F2EFE7` | Primary text |
| `--text-muted` | `rgba(21,22,27,0.62)` | `rgba(242,239,231,0.62)` | Sub-headlines, body |
| `--text-dim` | `rgba(21,22,27,0.38)` | `rgba(242,239,231,0.38)` | Meta, pending |
| `--mint` / `--mint-deep` | `#2DD4BF` / `#14B8A6` | `#5EEAD4` / `#2DD4BF` | Brand primary + gradient anchor |
| `--mint-glow` | `rgba(45,212,191,0.30)` | `rgba(94,234,212,0.28)` | Focus rings, shadows |
| `--iris` / `--iris-deep` | `#8B6DEB` / `#7C3AED` | `#A78BFA` / `#8B6DEB` | Brand secondary + gradient anchor |
| `--iris-glow` | `rgba(139,109,235,0.28)` | `rgba(167,139,250,0.28)` | Primary CTA shadow |
| `--coral` / `--coral-glow` | `#F26B3D` / `rgba(242,107,61,0.28)` | `#FB8E5A` / `rgba(251,142,90,0.28)` | Accent for streaming, cost, brand mark dot |
| `--success` | `#22A957` | `#6EE7A1` | Product UI only |
| `--error` | `#DC2626` | `#F87171` | Product UI only |

**Contrast notes (WCAG AA):**
- `--text` on `--bg` is AAA (17.3:1 light, 16.8:1 dark).
- `--text-muted` is AA for large but **fails AAA body** — flag for long-form.
- `--text-dim` **fails AA body** — use only for meta/pending, never standalone information.
- `--mint-deep` and `--coral` on `--bg` **fail AA body** — never use as long-form text. OK as gradient stop, decorative accent, or CTA fill text on coral.
- Gradient-text decorative accents must be paired with the same text in solid color via `aria-label` or surrounding context (screen readers don't read gradients).

## Typography

- **`--font-sans`: Hanken Grotesk** — display, headings, body, UI labels, run IDs, status badges, eyebrows (uppercase tracked 0.16em).
- **`--font-mono`: JetBrains Mono** — code blocks (`code/pre/kbd/samp`) and CLI commands ONLY. Never for non-code prose.
- **Tabular nums:** `.tabular` helper for run-ids, costs, counts.
- **Loading:** `fonts.bunny.net` (GDPR-clean) — preconnect + stylesheet in `app/layout.tsx`.

**Scale:**

| Class | Size | Line | Letter-spacing |
| --- | --- | --- | --- |
| display | `clamp(44px, 8vw, 108px)` | 0.96 | -0.045em |
| h1 | `clamp(36px, 5.8vw, 72px)` | 1.0 | -0.035em |
| h2 | `clamp(28px, 4.4vw, 52px)` | 1.05 | -0.03em |
| h3 | 22px | 1.25 | -0.005em |
| body-lg | 18px | 1.55 | — |
| body | 16px | 1.55 | — |
| eyebrow | 12px uppercase | — | 0.16em |
| meta | 12–13px | — | — |

## Radii

| Token | Value | Use |
| --- | --- | --- |
| `--radius-md` | 14px | Cards, inputs, panels |
| `--radius-lg` | 20px | Demo card head/foot transitions, section frames |
| `--radius-xl` | 28px | Demo card outer frame |
| `--radius-pill` | 9999px | Buttons, chips, badges, mode toggle |

## Brand mark — `( · )`

LOCKED. Two mint-deep parens holding a coral dot. Semantic readings: function call (engineer-trustable, MIT, CLI-native), viewfinder (we find), container (one ICP in focus).

Implemented in `packages/web/components/brand/Logo.tsx`. SVG viewBox 64×64. Stroke-width scales with size: 7 at 16px, 6 at 24px, 5.5 at 32–48px, 5 at 64px, 4.5 at 96px, 3.5 at 128px. Dot radius 6→8 over the same range. Adjust per size; do not just scale.

**Dark mode:** parens become lighter mint (`#2DD4BF` token resolves), dot stays coral.

**Lockups:**
- Horizontal: `[mark] icpfinder` — `Wordmark` component.
- Wrapped: `( icpfinder )` — footer, OG card subtitle.
- Tagline: `( find who'll pay )` — social posts.
- With version: `( icpfinder · v0.1 )` — readme header, footer.

**Forbidden:** never animate, never fill, never gradient, never glow underneath, never use below 12px (use the standalone coral dot instead).

## Motion

- Hover cards: `translateY(-1px)` + soft shadow boost, 220ms `cubic-bezier(0.2, 0.7, 0.2, 1)` (`--ease-out-soft`).
- Button press: `scale(0.97)` 80ms.
- Streaming dots: `icp-pulse` keyframe, 1100ms ease-in-out infinite, opacity 1 → 0.5 → 1.
- Mint→iris progress bar: width interpolates 300ms ease-out per chunk.
- No scroll animations, no parallax, no scroll-jacking.
- **`prefers-reduced-motion: reduce`** kills all animations/transitions via the base reset in `globals.css`.

## Layout

- Max container: **1240px**.
- Gutters: **72px desktop / 24px mobile** (Tailwind `px-6 md:px-12 lg:px-[72px]`).
- Mobile-first: single column → `md` 2-col → `lg` 3-col kanban for archetype cards.
- Hero B split: `lg:grid-cols-[1.05fr_1fr]` with 64px gap.
- Touch targets ≥44×44px (mobile).

## Components

| Component | File | Purpose |
| --- | --- | --- |
| `Logo` | `components/brand/Logo.tsx` | `( · )` SVG, accepts `size` 16–128, computes stroke + dot radius |
| `Wordmark` | `components/brand/Wordmark.tsx` | Logo + "icpfinder" |
| `ModeToggle` | `components/brand/ModeToggle.tsx` | Light / dark / system cycle, persists in `localStorage` |
| `Nav` | `components/marketing/Nav.tsx` | Sticky nav with brand, links, mode toggle, Try-it-free pill |
| `Hero` | `components/marketing/Hero.tsx` | Hero B split: copy + npm install line + CTAs + features + `CodePreview` on the right |
| `NpmInstallLine` | `components/marketing/NpmInstallLine.tsx` | `$ npm i …` line with clipboard copy button (client component for clipboard only) |
| `CodePreview` | `components/marketing/CodePreview.tsx` | Hand-tokenized TypeScript snippet, RSC, zero client JS for the highlight. Snippet pinned to real `IcpFinder` API via vitest gate (`__tests__/code-preview-snippet.test.ts`). |
| `CopyCodeButton` | `components/marketing/CopyCodeButton.tsx` | Clipboard button used by `CodePreview` (the only client JS in the code block) |
| `Integration` | `components/marketing/Integration.tsx` | Section below hero — heading + sub + `CodePreview` |
| `FinalCta` | `components/marketing/FinalCta.tsx` | Bottom CTA strip — single sentence, two buttons, hairline top border |
| `Footer` | `components/marketing/Footer.tsx` | Wordmark + github / npm / issues / roadmap links |
| `ArchetypeCard` | `components/product/ArchetypeCard.tsx` | Streaming archetype card used on `/find` |
| `RunProgress` | `components/product/RunProgress.tsx` | Gradient progress bar with `role=progressbar` |
| `RunHeader` | `components/product/RunHeader.tsx` | Run ID, pulse, elapsed, cost, BYOK badge |
| `EmptyState` | `components/product/EmptyState.tsx` | First-time `/find` — how-it-works + 3 example chips |

## Pages

- **`app/page.tsx`** — marketing landing (Nav + Hero + Integration + FinalCta + Footer). No fake testimonials. No press strip. No icon-grid feature cards. Code preview is the proof.
- **`app/find/page.tsx`** — product run UI (Nav + RunHeader + input + progress + ArchetypeCard grid + Footer).
- **`app/icon.tsx`** — Next dynamic favicon (32×32 PNG via `ImageResponse`).
- **`app/opengraph-image.tsx`** — OG card (1200×630, brand mark + gradient headline + meta strip).

## A11y baseline

- **Skip link** on every page (first focusable element).
- **`:focus-visible`** mint-deep 2px outline with 2px offset, inherited radius. Never disable without replacement.
- **`role=progressbar`** on `RunProgress` with `aria-valuenow/aria-valuemax/aria-valuetext`.
- **`aria-live="polite"`** on the results grid + run header (announces new archetypes).
- **`role=alert`** on errors.
- **`aria-labelledby`** on archetype cards pointing to their `h3`.
- **`aria-hidden="true"`** on decorative pulse dots + aurora.
- **Visible labels** on every form input. Placeholder is hint, not label.
- **Example chips** carry `aria-label="Use example: <text>"`.
- **`prefers-reduced-motion`** kills pulses + transitions.
- **Cmd+K** command palette — deferred to v0.2.

## Slop guardrails — enforced

| Rule | Enforcement |
| --- | --- |
| Aurora glow appears once per page | `Hero` only; no other section |
| Gradient text accent appears once per page | Marketing: `h1`. `/find`: `find` word in heading |
| Gradient fills only on CTAs, progress bar, mark | No gradient borders, backgrounds, icons |
| No fake social proof | `SocialProofStrip` fetches live data; empty → hides strip |
| No macOS traffic dots | Demo card header carries run-id + pulse + cost |
| No emoji in marketing copy | Use → ✓ • ★ Unicode glyphs sparingly |
| No 3-col SaaS feature grid with icon circles | Use horizontal text strip with pulse dots |
| No decorative floating SVG shapes | Aurora only |
| No fabricated demo data passed off as a live run | If the hero shows code, it must be runnable; the snippet is pinned to the real API via vitest gate. Static mock demo cards with invented contacts are not shipped. |
| No "0 users today" performative honesty section | Absence speaks. `SocialProofStrip` hides on zero; footer carries `MIT · v0.1 · PRs welcome` + roadmap link. |

## Cost display

Format = **USD dollars, 2 decimals**, the same way a grocery receipt prints. Examples:
`$0.00`, `$0.05`, `$1.05`, `$123.45`. Sub-cent amounts render as `<$0.01` so a real
(but tiny) run doesn't look free. Never roll your own format — use
`formatCostCents(cents)` from `lib/format-cost.ts`. Provider events stream raw
cents (e.g. `0.13`, `105.05`); the formatter divides by 100 before display.

## Non-goals (v0.2+)

- shadcn primitive library (current approach: token-driven custom components — same outcome, less ceremony).
- Public-runs feed on `/find` empty state (privacy + moderation scope deferred).
- Custom illustrations (anti-slop, mark + aurora is the only ornament).
- Animation library (framer-motion). CSS pulses + native transitions cover v0.1.
- Cmd+K command palette.
- `/docs` bespoke design (inherits landing tokens).
