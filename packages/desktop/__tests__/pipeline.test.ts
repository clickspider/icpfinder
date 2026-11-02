// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";
import { byReachFirst, stageOf, whenOf } from "../src/shared/pipeline";
import type { Company } from "../src/shared/types";

const now = Date.parse("2026-11-02T10:00:00Z");
const day = 86_400_000;
const co = (domain: string, extra: Partial<Company> = {}): Company => ({
  domain,
  name: domain,
  status: "candidate",
  ...extra,
});
const at = (daysAgo: number) => new Date(now - daysAgo * day).toISOString();

describe("pipeline stage", () => {
  it("follows the founder's approval until they set a stage", () => {
    expect(stageOf(co("a"), now)).toBe("new");
    expect(stageOf(co("a", { approval: "approved" }), now)).toBe("approved");
    expect(stageOf(co("a", { pipeline: { stage: "talking", at: at(1) } }), now)).toBe("talking");
  });
  it("turns a quiet contacted company into a follow-up after 5 days", () => {
    expect(stageOf(co("a", { pipeline: { stage: "contacted", at: at(4) } }), now)).toBe(
      "contacted"
    );
    expect(stageOf(co("a", { pipeline: { stage: "contacted", at: at(6) } }), now)).toBe("followup");
  });
});

describe("who to reach first", () => {
  it("files each company by how fresh its moment is, and sorts freshest and best first", () => {
    const t = (daysAgo: number) => ({ text: "x", url: "https://x.com/a", date: at(daysAgo) });
    const list = [
      co("nodate"),
      co("old", { trigger: t(60) }),
      co("week", { trigger: t(5) }),
      co("today-low", { trigger: t(1), match: 60 }),
      co("today-high", { trigger: t(1), match: 90 }),
    ];
    expect(list.map((c) => whenOf(c, now))).toEqual(["undated", "older", "week", "today", "today"]);
    expect([...list].sort(byReachFirst(now)).map((c) => c.domain)).toEqual([
      "today-high",
      "today-low",
      "week",
      "old",
      "nodate",
    ]);
  });
});
