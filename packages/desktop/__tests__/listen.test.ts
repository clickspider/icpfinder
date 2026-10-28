// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";
import { keywordHits, listenDue, type RawPost, shortlist } from "../src/shared/listen";

const cat = { id: "a", name: "Launched", keywords: ["just launched", "first customers"], on: true };
const post = (url: string, text: string, postedAt = "2026-10-26T10:00:00Z"): RawPost => ({
  source: "hn",
  url,
  author: "x",
  text,
  postedAt,
});

describe("listening", () => {
  it("counts keyword phrases, not loose single words", () => {
    expect(keywordHits("We just launched our app!", cat.keywords)).toBe(1);
    expect(keywordHits("Launched a rocket just now", ["just launched"])).toBe(1);
    expect(keywordHits("Nothing to see", cat.keywords)).toBe(0);
  });

  it("keeps only unseen posts that hit a keyword, best and newest first", () => {
    const out = shortlist(
      [
        post("1", "random post"),
        post("2", "just launched, looking for first customers"),
        post("3", "just launched today", "2026-10-27T10:00:00Z"),
        post("4", "just launched", "2026-10-25T10:00:00Z"),
        post("2", "duplicate just launched"),
      ],
      [cat],
      new Set(["4"])
    );
    expect(out.map((p) => p.url)).toEqual(["2", "3"]);
  });

  it("runs once a day, after the set time", () => {
    const now = new Date("2026-10-27T09:00:00");
    expect(listenDue("08:30", undefined, now)).toBe(true);
    expect(listenDue("08:30", "2026-10-27T08:45:00", now)).toBe(false);
    expect(listenDue("08:30", "2026-10-26T08:45:00", now)).toBe(true);
    expect(listenDue("10:00", undefined, now)).toBe(false);
  });
});

describe("browser site status", () => {
  it("reads the extension's errors", async () => {
    const { siteStatusOf } = await import("../src/shared/listen");
    expect(siteStatusOf("Failed to execute JavaScript: Host access is restricted by policy.")).toBe(
      "blocked"
    );
    expect(siteStatusOf("Claude in Chrome requires permission.")).toBe("ask");
    expect(siteStatusOf("www.reddit.com")).toBe("ok");
  });
});
