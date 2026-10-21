<img src=".github/assets/logo-light.svg" alt="" width="48" height="48">

# IcpFinder

Discover who could benefit from what you offer, find relevant companies, and explore how to reach them.

[Mac app](https://github.com/clickspider/icpfinder/releases) · [Web demo](https://icpfinder.dev) · [Documentation](./docs/quickstart.md) · [npm](https://www.npmjs.com/package/@icpfinder/core)

![Company research in IcpFinder: fit criteria, a supporting source, and where to reach the company](.github/assets/company-research.jpg)

*IcpFinder for Mac. Example data shown for illustration.*

Free and open source · [MIT license](./LICENSE)

## Explore companies that could fit

Review the reason each company surfaced, then choose which ones to research further.

![A customer profile with three example companies, recent signals, and research actions](.github/assets/company-shortlist.jpg)

*Illustrative companies and signals, shown before research.*

## IcpFinder for Mac

The Mac app helps you turn a website or written business description into suggested customer profiles. Review your business overview, refine the profiles, then choose when to search for and research companies.

- Connect your Claude, ChatGPT/Codex, or eligible Grok account. Model and tool access depend on your subscription.
- Review why a company could fit, the sources behind its findings, and possible ways to reach it.
- Keep your businesses and customer profiles in a local workspace. Research sends relevant information to your selected provider and enabled services.

Suggested profiles are starting points, not confirmed buyers. Opening the dashboard does not automatically start company research.

[Mac releases](https://github.com/clickspider/icpfinder/releases) · [Mac setup and provider details](./packages/desktop/README.md)

To run the Mac app from source:

```bash
git clone https://github.com/clickspider/icpfinder.git
cd icpfinder
bun install
bun run dev:desktop
```

## Web app and developer libraries

The [web app](https://icpfinder.dev) is a separate experience from the Mac workspace shown above. Its streaming discovery flow uses server-configured providers or API keys supplied by the user; it does not use the Mac app’s subscription sign-in flow.

The web flow can suggest customer profiles and enrich candidate companies with Hunter contact results. Availability, verification results, provider charges, and usage limits depend on configuration and provider responses. Stub mode uses illustrative data rather than live research.

The TypeScript libraries expose the discovery pipeline through provider interfaces, with streaming events and budget controls. The examples below concern these libraries and the web app, not Mac subscription usage.

## Install the libraries

```bash
# core engine + first-party adapters (Gemini + Hunter)
npm i @icpfinder/core @icpfinder/providers
# or
bun add @icpfinder/core @icpfinder/providers
# or
pnpm add @icpfinder/core @icpfinder/providers
```

Both packages ship as ESM + TypeScript-first, with zero side effects on import and [npm provenance attestations](https://docs.npmjs.com/generating-provenance-statements) (built via OIDC Trusted Publishing on GitHub Actions — every published tarball is cryptographically tied to the commit that produced it).

## Run the web app or terminal demo

```bash
git clone https://github.com/clickspider/icpfinder.git
cd icpfinder
bun install
bun run demo                       # zero keys, stub providers
cd packages/web && bun run dev     # full web UI on localhost:3000
```

The terminal demo uses stub providers and does not perform real research. The web app also needs its environment and database configured for the selected mode; see [the web quickstart](./docs/quickstart.md) and [self-hosting guide](./docs/self-host.md).

## Library usage

```ts
import { IcpFinder } from "@icpfinder/core";
import { GeminiLlmProvider, HunterEmailProvider } from "@icpfinder/providers";

const finder = new IcpFinder({
  llm: new GeminiLlmProvider({ apiKey: process.env.GEMINI_API_KEY! }),
  email: new HunterEmailProvider({ apiKey: process.env.HUNTER_API_KEY! }),
});

for await (const event of finder.find({
  seed: "AI tool that helps freelance designers handle client revisions",
  archetypeLimit: 3,
  candidatesPerArchetype: 5,
  budgetCapCents: 200,
})) {
  console.log(event);
  // { type: "archetype", archetype: {...} }
  // { type: "candidate", candidate: {...} }
  // { type: "cost",      cost: { costCents, provider, endpoint } }
  // { type: "done",      totalCostCents }
}
```

## Web MCP endpoint

The web app exposes an MCP server at `https://icpfinder.dev/mcp` (Streamable HTTP, no sign-in). It has one tool, `find_icp`. Give it a product idea or URL, and it returns 3 ICP archetypes.

- **Claude (web or desktop):** Settings → Connectors → Add custom connector → `https://icpfinder.dev/mcp`.
- **Claude Code:**

  ```bash
  claude mcp add --transport http icpfinder https://icpfinder.dev/mcp
  # Use your own Gemini key (provider limits and charges still apply):
  claude mcp add --transport http icpfinder https://icpfinder.dev/mcp --header "X-Gemini-Api-Key: $GEMINI_API_KEY"
  ```

Shared-key runs use the website’s limits. The MCP tool returns profiles; the [web discovery UI](https://icpfinder.dev/find) handles contact enrichment separately. This endpoint is independent of the Mac app’s provider connection.

## Repository layout

```text
packages/
├── desktop/    Electron Mac app, subscription connections, local workspace
├── core/       Discovery and research orchestration
├── providers/  Provider interfaces and adapters
└── web/        Next.js web app, streaming API, MCP endpoint, persistence
```

## Usage and costs

The software is MIT licensed. AI subscriptions and external services may have their own charges and limits.

- **Mac:** research uses your connected provider account. Optional services such as Hunter have separate requirements.
- **Web and libraries:** stub providers need no keys; live providers may charge for requests. Configured budgets and rate limits apply. See [web/library costs and budget controls](./docs/costs.md).

## Web run cache (optional)

In operator mode, the `/api/find` endpoint can cache complete SSE event streams in Vercel KV (Upstash Redis), keyed by `sha256(seed)` with a 15-minute TTL. Duplicate seeds replay instantly with zero Gemini calls — useful when the shared free-tier key keeps hitting rate limits. To enable, set:

```bash
KV_REST_API_URL=…
KV_REST_API_TOKEN=…
```

Unset → cache is a graceful no-op (every request goes live). BYOK runs always bypass the cache so user data stays user-side.

## Self-host the web app

Vercel + Postgres + Upstash, three steps: [docs/self-host.md](./docs/self-host.md).

## Telemetry

The hosted website uses Vercel Web Analytics. See [web telemetry documentation](./docs/telemetry.md) for its configuration and verification steps. These web deployment details do not describe the Mac app’s local storage or provider connections; those are documented in the [Mac README](./packages/desktop/README.md#data).

## Tests

```bash
bun run test       # vitest across workspaces
bun run typecheck  # tsc --noEmit across workspaces
bun run lint       # biome
```

The CI workflow runs these checks; lint is currently informational. See [`.github/workflows/ci.yml`](./.github/workflows/ci.yml). Publishing to npm is automated via [Changesets](https://github.com/changesets/changesets) + OIDC Trusted Publishing — see [CONTRIBUTING.md](./CONTRIBUTING.md#releasing--versioning).

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for planned work and [GitHub issues](https://github.com/clickspider/icpfinder/issues) for current discussions.

## Contributing

PRs, issues, and ideas are all welcome — this project gets better when more eyes find more edges. Whether you're fixing a typo, wiring up a new provider, or asking a question that turns into the next docs page, you belong here.

A few places to start:

- **Good first PR — add a new provider in under 50 lines.** Implement the `LlmProvider` or `EmailProvider` interface in `packages/providers/src/types.ts`, drop tests in `packages/providers/__tests__/`, ship. Apollo, Clearbit, OpenAI, Anthropic, Snov.io — all great candidates.
- **Open an issue.** Bug, idea, half-formed thought — all fine. See the [issue templates](./.github/ISSUE_TEMPLATE).
- **Discussions for design questions** — [GitHub Discussions](https://github.com/clickspider/icpfinder/discussions) is the right place for "should we do X?" before you write code.

Full developer setup, PR conventions, and how Changesets / OIDC publishing work: [CONTRIBUTING.md](./CONTRIBUTING.md). By participating you're agreeing to the [Code of Conduct](./CODE_OF_CONDUCT.md).

## Contributors

Built by people who got tired of paying $400/month for sales tools that should be commodity infrastructure.

<a href="https://github.com/clickspider/icpfinder/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=clickspider/icpfinder" alt="icpfinder contributors" />
</a>

See [Contributing](#contributing) to get involved.

## License

MIT. Use it. Fork it. Sell it. Don't sue. — See [LICENSE](./LICENSE).

<br/>

<p align="center">
  <sub>Made with ( · ) by <a href="https://github.com/clickspider">Daniel Frey (@clickspider)</a> · <a href="https://icpfinder.dev">icpfinder.dev</a></sub>
</p>
