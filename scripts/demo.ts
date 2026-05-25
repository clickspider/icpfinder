// SPDX-License-Identifier: MIT
//
// `bun run demo` — zero-config CLI demo. Streams IcpFinder.find() to
// stdout using the fake providers, so anyone can clone the repo and
// see live output without API keys, a database, or Next.js.
//
// Usage:
//   bun run demo
//   bun run demo "Your product description here"

import { IcpFinder } from "@icpfinder/core";
import { FakeEmailProvider, FakeLlmProvider } from "@icpfinder/providers";

const DEFAULT_SEED =
  "AI invoicing tool for indie SaaS founders that auto-categorizes Stripe payouts and reconciles them against shipped product changes.";

const seed = process.argv.slice(2).join(" ").trim() || DEFAULT_SEED;

const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;

const main = async (): Promise<void> => {
  console.log(bold("icpfinder demo"));
  console.log(dim(`seed: ${seed}\n`));

  const finder = new IcpFinder({
    llm: new FakeLlmProvider(),
    email: new FakeEmailProvider(),
  });

  let totalCostCents = 0;
  let archetypeCount = 0;
  let candidateCount = 0;

  for await (const event of finder.find({ seed, archetypeLimit: 3, candidatesPerArchetype: 3 })) {
    if (event.type === "archetype") {
      archetypeCount += 1;
      console.log(`\n${bold(green(`# ${archetypeCount}. ${event.archetype.role}`))}`);
      console.log(dim(`   ${event.archetype.industry} · ${event.archetype.companySize}`));
      console.log(`   ${event.archetype.pain}`);
      if (event.archetype.buyingSignals.length > 0) {
        console.log(dim(`   signals: ${event.archetype.buyingSignals.join(" · ")}`));
      }
    } else if (event.type === "candidate") {
      candidateCount += 1;
      const name =
        `${event.candidate.contactFirstName ?? "?"} ${event.candidate.contactLastName ?? ""}`.trim();
      const email = event.candidate.contactEmail ?? event.candidate.domain;
      console.log(`   → ${cyan(email)} ${dim(`(${name})`)}`);
    } else if (event.type === "cost") {
      totalCostCents += event.cost.costCents;
    } else if (event.type === "error") {
      console.error(`\n[error] ${event.message} (recoverable=${event.recoverable})`);
    } else if (event.type === "done") {
      console.log(
        `\n${dim(
          `done · ${archetypeCount} archetypes · ${candidateCount} candidates · ${totalCostCents.toFixed(2)} ¢`
        )}`
      );
    }
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
