// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";
import { reachFirst, stageOf } from "../src/shared/pipeline";
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
  it("groups by how fresh the moment is, best match first, skipping rejected and contacted", () => {
    const t = (daysAgo: number) => ({ text: "x", url: "https://x.com/a", date: at(daysAgo) });
    const b = reachFirst(
      [
        co("today-low", { trigger: t(1), match: 60 }),
        co("today-high", { trigger: t(1), match: 90 }),
        co("week", { trigger: t(5) }),
        co("old", { trigger: t(60) }),
        co("nodate"),
        co("rejected", { trigger: t(1), approval: "rejected" }),
        co("contacted", { trigger: t(1), pipeline: { stage: "contacted", at: at(1) } }),
      ],
      now
    );
    expect(b.map((x) => x.companies.map((c) => c.domain))).toEqual([
      ["today-high", "today-low"],
      ["week"],
      [],
      ["old"],
      ["nodate"],
    ]);
  });
});
