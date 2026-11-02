// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";
import { timingOf, whoAt } from "../src/shared/timing";
import type { Company } from "../src/shared/types";

const NOW = Date.parse("2026-10-27T12:00:00Z");
const co = (date?: string): Company =>
  ({
    domain: "a.com",
    name: "A",
    status: "candidate",
    trigger: date ? { text: "x", date } : undefined,
  }) as Company;

describe("timing and people", () => {
  it("ranks fresh moments first", () => {
    expect(timingOf(co("2026-10-26"), NOW).label).toBe("Act today");
    expect(timingOf(co("2026-10-22"), NOW).label).toBe("This week");
    expect(timingOf(co("2026-10-10"), NOW).label).toBe("This month");
    expect(timingOf(co("2026-08-01"), NOW).rank).toBe(3);
    expect(timingOf(co(), NOW).label).toBe("No date");
  });
  it("names the person from a found profile when research has none", () => {
    const c = {
      ...co(),
      reach: [{ kind: "hn", url: "https://news.ycombinator.com/user?id=gab", source: "x" }],
    } as Company;
    expect(whoAt(c)).toBe("gab");
    expect(whoAt(co())).toBeUndefined();
  });
});
