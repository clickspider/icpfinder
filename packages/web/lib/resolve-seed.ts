// SPDX-License-Identifier: MIT
//
// Turn the user's raw seed into the text the archetype model reads: a URL
// seed is scanned into a product summary, and the result is capped.
// Shared by /api/archetypes and the /mcp tool.

import { scanUrl } from "./scan-url";
import { classifySeed } from "./seed-input";

export const MAX_SEED_LENGTH = 8_000;

export async function resolveSeed(rawSeed: string): Promise<string> {
  const classified = classifySeed(rawSeed);
  let effectiveSeed = rawSeed;
  if (classified.kind === "url" && classified.url) {
    const scanned = await scanUrl(classified.url);
    if (scanned.seed && scanned.seed.length > 0) effectiveSeed = scanned.seed;
  }
  return effectiveSeed.slice(0, MAX_SEED_LENGTH);
}
