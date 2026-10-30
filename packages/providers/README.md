# @icpfinder/providers

Swappable `LlmProvider` + `EmailProvider` implementations for [`@icpfinder/core`](https://www.npmjs.com/package/@icpfinder/core).

- `GeminiProvider` — Google Gemini LLM adapter
- `HunterProvider` — Hunter.io email-finding adapter
- `FakeProvider` — deterministic in-memory provider for tests
- `ContextDevPeopleSearch` — find people from a plain-language description ([Context.dev](https://docs.context.dev/api-reference/people/search))

Part of [icpfinder](https://github.com/clickspider/icpfinder) — free, open-source, MIT.

## Install

```bash
npm i @icpfinder/providers
# or
bun add @icpfinder/providers
```

## Usage

```ts
import { GeminiProvider } from "@icpfinder/providers/gemini";
import { HunterProvider } from "@icpfinder/providers/hunter";
import { FakeProvider } from "@icpfinder/providers/fake";

const llm = new GeminiProvider({ apiKey: process.env.GEMINI_API_KEY! });
const email = new HunterProvider({ apiKey: process.env.HUNTER_API_KEY! });
```

Or import everything from the root:

```ts
import { GeminiProvider, HunterProvider, FakeProvider } from "@icpfinder/providers";
```

## People search (Context.dev)

```ts
import { ContextDevPeopleSearch } from "@icpfinder/providers/context-dev";

// Reads CONTEXT_DEV_API_KEY when apiKey is not passed.
const people = new ContextDevPeopleSearch();
const { people: found, nextCursor, cost } = await people.search({
  query: "solo founders shipping AI developer tools",
  mode: "fast", // "ultra" = deeper, 50 credits instead of 10
  filters: { countries: ["US", "NL"], yearsOfExperienceMin: 3 },
});
```

From the repo root: `bun run people -- "someone who wants to build cool shit."`

## Building your own provider

Implement the `LlmProvider` or `EmailProvider` interface from `@icpfinder/providers`:

```ts
import type { LlmProvider, EmailProvider } from "@icpfinder/providers";
```

## License

MIT — see [LICENSE](./LICENSE).
