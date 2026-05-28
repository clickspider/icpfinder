# Contributing to icpfinder

Thanks for taking the time to look. Whether you're filing a one-line typo fix or a brand-new provider, this guide gets you from clone to merged PR in about ten minutes.

By participating you're agreeing to the [Code of Conduct](./CODE_OF_CONDUCT.md).

## Quick links

- **Bugs / requests:** [open an issue](https://github.com/clickspider/icpfinder/issues/new/choose)
- **Design questions / "should we do X?":** [Discussions](https://github.com/clickspider/icpfinder/discussions)
- **Live demo:** <https://icpfinder.dev>
- **Roadmap:** [README.md → Roadmap](./README.md#roadmap)

## Development setup

```bash
git clone https://github.com/clickspider/icpfinder.git
cd icpfinder
bun install
bun run demo                # stub providers, no API keys needed
bun run test                # 80+ vitest suites
bun run typecheck           # tsc --noEmit across workspaces
bun run lint                # biome
```

To run the web UI:

```bash
cd packages/web
cp .env.example .env.local  # add GEMINI_API_KEY + HUNTER_API_KEY for live runs
bun run dev                 # http://localhost:3000
```

Stub mode works without any keys. Live mode needs a Gemini API key (free tier is fine) and a Hunter.io key.

## PR conventions

Anything that compiles, ships green tests, and passes Biome is a candidate for merge. Specifically:

- `bun run typecheck` — clean across `packages/core`, `packages/providers`, `packages/web`
- `bun run test` — all vitest suites pass
- `bun run lint` — Biome clean

CI (`.github/workflows/ci.yml`) enforces all three on every PR. No need to make CI green manually before opening — open the PR, push, watch.

Commit messages don't need to be Conventional Commits. Just describe the change.

Keep PRs focused: one logical change per PR. If you find yourself bundling a bugfix with a refactor with a new feature, split it.

## Sign off your commits

Every commit must be signed off under the [Developer Certificate of Origin (DCO)](./DCO.md) — the same lightweight sign-off the Linux kernel uses. The `probot/dco` GitHub App checks this on every PR. Without it, CI blocks the merge.

`git` does this automatically with the `-s` flag:

```bash
git commit -s -m "fix(web): handle stale CSRF on /find submit"
```

This appends a `Signed-off-by:` trailer to your commit message using your `user.name` and `user.email` from `git config`. Set those once globally if you haven't:

```bash
git config --global user.name  "Your Name"
git config --global user.email "you@example.com"
```

**By signing off, you certify the [DCO v1.1 text](./DCO.md) AND you agree that:**

1. Your contribution is licensed under the MIT License — the same license as the rest of the project ("inbound = outbound").
2. The maintainers may relicense your contribution under any OSI-approved license should the project's license ever change.

Why both: DCO certifies you have the right to submit the code, but doesn't grant relicensing rights on its own. The relicense clause keeps the project's license posture flexible without re-contacting every contributor later.

### Forgot to sign off?

```bash
# Last commit only:
git commit --amend --signoff

# Multiple commits on your branch (replace 3 with the number to fix):
git rebase --signoff HEAD~3
```

Then force-push to your PR branch.

### Squash merges and DCO

GitHub's default squash-merge UI **strips per-commit `Signed-off-by:` trailers**. If maintainers squash your PR, they will paste a `Signed-off-by:` line into the squash-merge body manually. You don't need to do anything different on your side — keep signing off your commits as usual.

### AI-assisted commits

If you use Claude Code, Copilot, or any AI assistant to write code, you (the human submitting it) are still responsible for the DCO sign-off. The AI tool's `Co-Authored-By:` trailer is **not** a substitute for `Signed-off-by:` — they certify different things. Run `git commit -s` like any other commit.

## Adding a new provider

The whole point of `packages/providers` is that any model or contact API can slot in. New providers usually need under 50 lines:

1. Read the `LlmProvider` or `EmailProvider` interface in `packages/providers/src/types.ts`.
2. Create `packages/providers/src/<your-provider>.ts` implementing it.
3. Export it from `packages/providers/src/index.ts`.
4. Add a test file at `packages/providers/__tests__/<your-provider>.test.ts` covering happy path + at least one failure mode (rate limit, auth error, network error).
5. Open a PR.

We'll review fast. If the provider has a free tier, even better — easier for everyone to test.

## Releasing & versioning

This repo uses [Changesets](https://github.com/changesets/changesets) for `@icpfinder/core` and `@icpfinder/providers`. If your PR changes code in either of those packages, add a changeset:

```bash
bunx changeset
```

This prompts for the affected packages, the bump kind (patch / minor / major), and a one-line summary. The resulting `.changeset/<random-name>.md` file gets committed alongside your code change.

What happens when your PR merges:

1. **PR snapshot** — every PR automatically publishes a per-commit build to [`pkg.pr.new`](https://pkg.pr.new). The bot comments on your PR with an `npm install` URL so reviewers can install your exact build without waiting for a real release. Try them with:
   ```bash
   npm install https://pkg.pr.new/@icpfinder/core@<pr-number>
   ```
2. **Release PR** — once your PR is in `main`, the Changesets bot opens (or updates) a "chore: version packages" PR that bumps the version numbers and writes the changelogs based on accumulated changesets.
3. **Publish** — when the version PR merges, `release.yml` publishes the new versions to npm via **OIDC Trusted Publishing**. No `NPM_TOKEN` lives in this repo — npm's [Trusted Publishing](https://docs.npmjs.com/trusted-publishers) exchanges the GitHub Actions OIDC token for a short-lived publish token at publish time, and the resulting tarball ships an [npm provenance attestation](https://docs.npmjs.com/generating-provenance-statements) cryptographically tying it back to the commit.

You don't need to think about most of this. Just remember `bunx changeset` if you touched `core` or `providers`.

## Filing a good issue

Use the [issue templates](./.github/ISSUE_TEMPLATE) — they're short. If your issue is open-ended ("I think the API should look like X"), open a [Discussion](https://github.com/clickspider/icpfinder/discussions) first so we can sketch before someone writes code.

## Questions

If you're stuck, [open a Discussion](https://github.com/clickspider/icpfinder/discussions/new/choose). No question is too small. The worst that happens is someone learns something.
