// SPDX-License-Identifier: MIT
//
// Regression guard for app/layout.tsx — ensures Vercel Web Analytics
// stays wired. The self-host no-fire contract depends on @vercel/analytics
// being imported and the <Analytics /> tag rendered in <body>. If someone
// "tidies up" layout.tsx and drops either, this test fires.
//
// We assert on the file contents (not via render) because the root layout
// is a Server Component and the project's vitest config runs in a node
// env without React DOM testing infra. A static check is sufficient for
// the regression we care about: someone deleting the analytics wiring.
//
// If you intentionally remove analytics: update this test in the same
// commit. The test failing should force a deliberate decision, not a
// silent loss.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const LAYOUT_PATH = join(__dirname, "..", "app", "layout.tsx");

describe("app/layout.tsx — analytics wiring", () => {
  const source = readFileSync(LAYOUT_PATH, "utf8");

  it("imports Analytics from @vercel/analytics/next", () => {
    expect(source).toMatch(/import\s*\{\s*Analytics\s*\}\s*from\s*["']@vercel\/analytics\/next["']/);
  });

  it("renders the <Analytics /> tag", () => {
    expect(source).toMatch(/<Analytics\s*\/>/);
  });
});
