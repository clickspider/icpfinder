// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";
import { parseClaudeUsage } from "../src/main/plan";

describe("Claude plan usage", () => {
  it("reads the windows from /usage", () => {
    const p = parseClaudeUsage(
      "You are currently using your subscription to power your Claude Code usage\n\nCurrent session: 11% used · resets Oct 20 at 8:20pm (Europe/Amsterdam)\nCurrent week (all models): 2% used · resets Oct 22 at 8am (Europe/Amsterdam)\nCurrent week (Fable): 0% used · resets Oct 22 at 8am (Europe/Amsterdam)\n"
    );
    expect(p.plan).toBe("Subscription");
    expect(p.windows).toEqual([
      { label: "Session", pct: 11, resets: "Oct 20 at 8:20pm" },
      { label: "Week · all models", pct: 2, resets: "Oct 22 at 8am" },
      { label: "Week · Fable", pct: 0, resets: "Oct 22 at 8am" },
    ]);
  });
});

describe("plan windows", () => {
  it("starts a session 5 hours before its reset, a week 7 days before", async () => {
    const { windowStart } = await import("../src/main/plan");
    const now = new Date(2026, 9, 20, 15, 0);
    expect(windowStart("Session", "Oct 20 at 8:20pm", now)?.getHours()).toBe(15);
    expect(windowStart("Week · all models", "Oct 22 at 8am", now)?.getDate()).toBe(15);
  });
});
