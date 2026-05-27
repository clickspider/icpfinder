---
"@icpfinder/core": patch
"@icpfinder/providers": patch
---

Fix broken v0.2.0 publish.

1. **Entry points pointed at uncompiled source.** v0.2.0 shipped `main`/`exports` set to `./src/index.ts`, but `files: ["dist", ...]` excluded `src/` from the tarball, so `import "@icpfinder/core"` failed with `MODULE_NOT_FOUND`. Root cause: `publishConfig.main`/`publishConfig.exports` are **not** honored by `npm publish` — only `.npmrc` keys (`access`, `registry`, `tag`, `provenance`) are. The field-override pattern is a pnpm extension. `main`/`exports` now live at the top level and point at compiled `dist/`.

2. **`workspace:^` leaked into the published tarball.** `packages/core` declared `"@icpfinder/providers": "workspace:^"`. Because the repo uses Bun workspaces (npm-style layout), Changesets did not rewrite the protocol on publish, so installs failed with `EUNSUPPORTEDPROTOCOL`. Replaced with a plain semver range (`"^0.2.1"`); Bun still resolves to the local workspace during dev because the range matches.

3. **Latent ESM extension bug.** Even after (1) and (2), `tsc` (with `moduleResolution: "Bundler"`) emitted extensionless relative imports (`from "./archetypes"`), which Node ESM rejects under `"type": "module"`. The web app masked this via `transpilePackages`, but external consumers running plain `node` would have broken. Migrated the build to `tsup` (esbuild) per the Turborepo "Publishing Libraries" guide. Both packages now ship ESM (`.js`) + CJS (`.cjs`) bundles plus `.d.ts` types, so `import` and `require` both work in plain Node.

Web app consumption is unchanged — `next.config.mjs` already sets `transpilePackages` for both libraries.
