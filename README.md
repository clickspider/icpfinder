# icpfinder

> Free, open-source first-customer-discovery tool for indie AI builders. Paste your idea, get 15 verified prospects with outreach hooks. In 30 seconds. MIT.

**Status: pre-release. v0.1.0 ships [target: end of week 2026-05-29].** Building in public.

---

## Why this exists

You built something. You don't know who'll pay for it. You hate cold outreach.

This finds the people who already have your problem **and** tells you what to say to them. Free. MIT. No signup for the hosted demo. Bring your own keys to self-host.

## Try it

Coming this week. Hosted demo at [icpfinder.dev](https://icpfinder.dev) — free, capped at 10 generations per IP per day. Self-host has no cap.

## How it works

1. **Archetype detection** — your idea → 3 ICP archetypes (industry / role / pain / buying-signals) via Gemini with Google grounding.
2. **Candidate discovery** — each archetype → 5 real companies with verified decision-maker emails via Hunter.io.
3. **Outreach personalization** — each candidate → a 2-sentence hook referencing a real, observable signal (recent funding, hiring posts, public discussion).

## Self-host (planned API)

```bash
git clone https://github.com/clickspider/icpfinder
cd icpfinder
bun install
bun run demo                    # zero keys, fixture data, 5 minutes to first result
cp .env.example .env            # add HUNTER_API_KEY + GOOGLE_GENERATIVE_AI_API_KEY
bun run dev                     # full pipeline with your keys
```

Costs (your keys, your bill): Hunter free tier is 25 searches/month, ~$0.05-0.07 per Email Finder call on paid tiers. Gemini 2.5 Flash free tier is 1500 requests/day. See `docs/costs.md` once it lands.

## Library API (planned)

```ts
import { IcpFinder, HunterEmailProvider, GeminiLlmProvider } from "icpfinder";

const client = new IcpFinder({
  emailProvider: new HunterEmailProvider({ apiKey: process.env.HUNTER_API_KEY }),
  llmProvider:   new GeminiLlmProvider({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY }),
});

// Stream events as they generate
for await (const event of client.find("an AI tool that helps freelance designers handle client revisions")) {
  console.log(event); // { type: 'archetype-start' | 'company-found' | 'hook-generated' | ... }
}

// Or block until done
const result = await client.findAll("...");
console.log(result.archetypes, result.cost.usd);
```

## Architecture

- `packages/core` — algorithm, no IO except via provider interfaces
- `packages/providers` — swappable Hunter / Gemini / future Apollo / Clearbit / OpenAI / fake (for demo mode)
- `packages/web` — Next.js + Prisma hosted demo

## Roadmap

See [ROADMAP.md](ROADMAP.md) once it lands. Highlights:

- **v0.1** — web demo + library + provider interfaces + streaming + demo mode
- **v0.2** — React Flow node-graph visualization, CLI, Claude Code skill
- **v0.3** — cold-outreach diagnostician (paste your failing emails, get a diagnosis + rewrite)

## Built in public

Daily updates on X (handle linked once confirmed).

## License

MIT. Use it. Fork it. Sell it. Don't sue.
