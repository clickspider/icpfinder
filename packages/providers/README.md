# @icpfinder/providers

Swappable `LlmProvider` + `EmailProvider` implementations for [`@icpfinder/core`](https://www.npmjs.com/package/@icpfinder/core).

- `GeminiProvider` — Google Gemini LLM adapter
- `HunterProvider` — Hunter.io email-finding adapter
- `FakeProvider` — deterministic in-memory provider for tests

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

## Building your own provider

Implement the `LlmProvider` or `EmailProvider` interface from `@icpfinder/providers`:

```ts
import type { LlmProvider, EmailProvider } from "@icpfinder/providers";
```

## License

MIT — see [LICENSE](./LICENSE).
