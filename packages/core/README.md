# @icpfinder/core

Provider-agnostic streaming engine for ICP (ideal customer profile) discovery. Given a product idea, generates 3 ICP archetypes and streams verified candidate companies + contact emails.

Part of [icpfinder](https://github.com/clickspider/icpfinder) — free, open-source, MIT.

## Install

```bash
npm i @icpfinder/core @icpfinder/providers
# or
bun add @icpfinder/core @icpfinder/providers
```

`@icpfinder/core` is the engine; `@icpfinder/providers` ships the Gemini + Hunter adapters used below. Bring your own keys.

## Usage

```ts
import { IcpFinder } from "@icpfinder/core";
import { GeminiProvider, HunterProvider } from "@icpfinder/providers";

const finder = new IcpFinder({
  llm: new GeminiProvider({ apiKey: process.env.GEMINI_API_KEY! }),
  email: new HunterProvider({ apiKey: process.env.HUNTER_API_KEY! }),
});

for await (const event of finder.run({ product: "AI code review tool for solo devs" })) {
  // event: { type: "archetype" | "candidate" | "email" | "done" | ... }
  console.log(event);
}
```

## Subpath exports

- `@icpfinder/core` — main entry (`IcpFinder`, archetypes, types).
- `@icpfinder/core/types` — TypeScript types only.
- `@icpfinder/core/safe-fetch` — hardened `fetch` wrapper used internally (timeout + retry + SSRF guard).

## License

MIT — see [LICENSE](./LICENSE).
