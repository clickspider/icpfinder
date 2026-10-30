// SPDX-License-Identifier: MIT
//
// `bun run people` — find people who match a plain-language description,
// via Context.dev people search. Needs CONTEXT_DEV_API_KEY.
//
// Usage:
//   bun run people -- "someone who wants to build cool shit."
//   bun run people -- "solo founders shipping AI tools" --mode ultra --countries NL,IL --json
//   bun run people -- "<same query>" --cursor <next cursor from the last run>
//
// Cost: fast = 10 credits, ultra = 50 credits per call (no matches = free).

import {
  ContextDevPeopleSearch,
  isProviderError,
  type PeopleSearchMode,
} from "@icpfinder/providers";

const args = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const flagValues = new Set(
  ["mode", "countries", "min-years", "max-years", "cursor"].map((n) => flag(n)).filter(Boolean)
);
const query = args.find((a) => !a.startsWith("--") && !flagValues.has(a));

if (!query) {
  console.error(
    'Usage: bun run people -- "<who to find>" [--mode fast|ultra] [--countries US,NL] [--json]'
  );
  process.exit(1);
}

const provider = new ContextDevPeopleSearch();
if (!provider.configured) {
  console.error("Set CONTEXT_DEV_API_KEY first.");
  process.exit(1);
}

const num = (v: string | undefined): number | undefined =>
  v === undefined ? undefined : Number(v);

try {
  const result = await provider.search({
    query,
    mode: (flag("mode") as PeopleSearchMode | undefined) ?? "fast",
    filters: {
      countries: flag("countries")?.split(","),
      yearsOfExperienceMin: num(flag("min-years")),
      yearsOfExperienceMax: num(flag("max-years")),
    },
    cursor: flag("cursor"),
    tags: ["icpfinder-cli"],
  });

  if (args.includes("--json")) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    for (const [i, p] of result.people.entries()) {
      const company = p.role.company?.name ? ` @ ${p.role.company.name}` : "";
      const place = [p.location.city, p.location.countryCode].filter(Boolean).join(", ");
      const match =
        p.matchConfidence === null ? "" : ` (match ${Math.round(p.matchConfidence * 100)}%)`;
      console.log(`${i + 1}. ${p.name ?? "(no name)"} — ${p.role.title ?? "?"}${company}${match}`);
      if (place) console.log(`   ${place}`);
      if (p.description) console.log(`   ${p.description}`);
      for (const url of p.profiles) console.log(`   ${url}`);
    }
    if (!result.people.length) console.log("No matches (no credits used).");
    console.log(
      `\n${result.cost.units} credits used, ${result.creditsRemaining ?? "?"} left.` +
        (result.nextCursor ? "\nMore results exist: rerun with --json to get next_cursor." : "")
    );
  }
} catch (err) {
  console.error(isProviderError(err) || err instanceof RangeError ? err.message : err);
  process.exit(1);
}
