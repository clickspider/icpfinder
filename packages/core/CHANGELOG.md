# @icpfinder/core

## 0.5.0

### Minor Changes

- [#41](https://github.com/clickspider/icpfinder/pull/41) [`a2a8a4a`](https://github.com/clickspider/icpfinder/commit/a2a8a4af00ccf266dd6895d76a4792f99392d0ae) Thanks [@clickspider](https://github.com/clickspider)! - ICP discovery user-feedback round 1 — two-phase API, archetype reasoning, opt-in deepening.

  Core schema additions (back-compat — all new fields optional):

  - `Archetype.reasoning` — short paragraph explaining why this persona belongs in the set.
  - `Archetype.sellingAngle` — one-line outreach hook for the persona.
  - `Archetype.objections` — top 3 likely "no" lines.
  - `ExampleCompany.whyNow` — concrete recent trigger for this specific company.
  - `Candidate.whyNow` — propagated from the matching example company.
  - New exported `DeepenResult` type — `{ candidateId, trigger, provenanceUrl, dossier }`.

  New IcpFinder method:

  - `IcpFinder.enrichOne(archetype, { candidatesPerArchetype, offset?, signal?, budgetCapCents? })` — phase-2 helper that yields candidate + cost + recoverable-error events for ONE archetype. Powers the new two-phase web API (`/api/archetypes` then `/api/candidates`). Existing `find()` still works unchanged for SDK consumers.

  Providers:

  - Updated `GeminiLlmProvider` stub payload to include the new archetype fields so stub-mode UI renders identically to live mode.

### Patch Changes

- Updated dependencies [[`a2a8a4a`](https://github.com/clickspider/icpfinder/commit/a2a8a4af00ccf266dd6895d76a4792f99392d0ae)]:
  - @icpfinder/providers@0.5.0

## 0.4.0

### Minor Changes

- [#18](https://github.com/clickspider/icpfinder/pull/18) [`d8f4e3b`](https://github.com/clickspider/icpfinder/commit/d8f4e3b4e7f5d9a86b7aad1ec00ff69e4d24f790) Thanks [@clickspider](https://github.com/clickspider)! - Initial public npm release.

  - `@icpfinder/core` — provider-agnostic ICP discovery engine. Streams archetypes, candidates, and verified emails for a given product idea.
  - `@icpfinder/providers` — Gemini LLM adapter, Hunter.io email adapter, and `FakeProvider` for tests.

  Bring your own keys. MIT.

### Patch Changes

- [#18](https://github.com/clickspider/icpfinder/pull/18) [`d8f4e3b`](https://github.com/clickspider/icpfinder/commit/d8f4e3b4e7f5d9a86b7aad1ec00ff69e4d24f790) Thanks [@clickspider](https://github.com/clickspider)! - Fix broken v0.2.0 publish.

  1. **Entry points pointed at uncompiled source.** v0.2.0 shipped `main`/`exports` set to `./src/index.ts`, but `files: ["dist", ...]` excluded `src/` from the tarball, so `import "@icpfinder/core"` failed with `MODULE_NOT_FOUND`. Root cause: `publishConfig.main`/`publishConfig.exports` are **not** honored by `npm publish` — only `.npmrc` keys (`access`, `registry`, `tag`, `provenance`) are. The field-override pattern is a pnpm extension. `main`/`exports` now live at the top level and point at compiled `dist/`.

  2. **`workspace:^` leaked into the published tarball.** `packages/core` declared `"@icpfinder/providers": "workspace:^"`. Because the repo uses Bun workspaces (npm-style layout), Changesets did not rewrite the protocol on publish, so installs failed with `EUNSUPPORTEDPROTOCOL`. Replaced with a plain semver range (`"^0.2.0"`); Bun still resolves to the local workspace during dev because the range matches. Changesets `updateInternalDependencies: patch` keeps it in lockstep on each release.

  3. **Latent ESM extension bug.** `tsc` (with `moduleResolution: "Bundler"`) emitted extensionless relative imports (`from "./archetypes"`), which Node ESM rejects under `"type": "module"`. The web app masked this via `transpilePackages`, but external consumers running plain `node` would have broken. Migrated the build to `tsup` (esbuild) per the Turborepo "Publishing Libraries" guide.

  4. **ESM-only publish.** Both packages now ship pure ESM (`.js` + `.d.ts`). CJS output was considered and rejected: `p-limit@^6.2.0` is ESM-only, so any CJS bundle would `require()` an ESM module and crash with `ERR_REQUIRE_ESM` on Node 20.0–20.18 (the LTS line we advertise via `engines.node: ">=20"`). ESM-only matches the 2026 industry default (chalk, ora, execa, got, node-fetch, and most of the sindresorhus catalog) and is forward-compatible with Node 22.12+'s stable `require(esm)` — CJS consumers can `require()` the ESM dist directly on modern Node.

  Web app consumption is unchanged — `next.config.mjs` already sets `transpilePackages` for both libraries. `turbo.json` `dev` task now `dependsOn: ["^build"]` so a fresh-clone `bun run dev` boots `next dev` only after `tsup` has emitted an initial `dist/`.

- Updated dependencies [[`d8f4e3b`](https://github.com/clickspider/icpfinder/commit/d8f4e3b4e7f5d9a86b7aad1ec00ff69e4d24f790), [`d8f4e3b`](https://github.com/clickspider/icpfinder/commit/d8f4e3b4e7f5d9a86b7aad1ec00ff69e4d24f790)]:
  - @icpfinder/providers@0.4.0

## 0.3.0

### Minor Changes

- [#16](https://github.com/clickspider/icpfinder/pull/16) [`27d7d8f`](https://github.com/clickspider/icpfinder/commit/27d7d8f871c361cf1a17ab69956ffe4c0b8f3dc4) Thanks [@clickspider](https://github.com/clickspider)! - Initial public npm release.

  - `@icpfinder/core` — provider-agnostic ICP discovery engine. Streams archetypes, candidates, and verified emails for a given product idea.
  - `@icpfinder/providers` — Gemini LLM adapter, Hunter.io email adapter, and `FakeProvider` for tests.

  Bring your own keys. MIT.

### Patch Changes

- Updated dependencies [[`27d7d8f`](https://github.com/clickspider/icpfinder/commit/27d7d8f871c361cf1a17ab69956ffe4c0b8f3dc4)]:
  - @icpfinder/providers@0.3.0

## 0.2.0

### Minor Changes

- [#14](https://github.com/clickspider/icpfinder/pull/14) [`f782c41`](https://github.com/clickspider/icpfinder/commit/f782c41cd8337f43fff9288fc892d5bd8eeebf40) Thanks [@clickspider](https://github.com/clickspider)! - Initial public npm release.

  - `@icpfinder/core` — provider-agnostic ICP discovery engine. Streams archetypes, candidates, and verified emails for a given product idea.
  - `@icpfinder/providers` — Gemini LLM adapter, Hunter.io email adapter, and `FakeProvider` for tests.

  Bring your own keys. MIT.

### Patch Changes

- Updated dependencies [[`f782c41`](https://github.com/clickspider/icpfinder/commit/f782c41cd8337f43fff9288fc892d5bd8eeebf40)]:
  - @icpfinder/providers@0.2.0
