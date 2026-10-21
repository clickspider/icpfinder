// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";
import { classify, mergeReach, reachIn, reachSearches } from "../src/shared/reach";

describe("reach links", () => {
  it("knows posts, profiles and junk apart", () => {
    expect(classify("https://news.ycombinator.com/item?id=1")).toBe("post");
    expect(classify("https://news.ycombinator.com/user?id=gab")).toBe("hn");
    expect(classify("https://x.com/gab/status/123")).toBe("post");
    expect(classify("https://twitter.com/gab")).toBe("x");
    expect(classify("https://x.com/intent/tweet?text=hi")).toBeNull();
    expect(classify("https://www.linkedin.com/in/gab/")).toBe("linkedin");
    expect(classify("https://www.linkedin.com/shareArticle?x=1")).toBeNull();
    expect(classify("https://github.com/gab")).toBe("github");
    expect(classify("https://github.com/gab/repo")).toBeNull();
    expect(classify("mailto:gab@site.com")).toBe("email");
    expect(classify("https://site.com/pricing")).toBeNull();
  });

  it("reads footer links from HTML, one per URL, post first", () => {
    const html = `<a href="https://github.com/gab">gh</a><a href='https://x.com/gab'>x</a>
      <a href="https://x.com/gab/">again</a><a href="mailto:hi@site.com?subject=x">mail</a>
      <a href="/about">about</a>`;
    const links = mergeReach([
      ...reachIn(html, "their website"),
      { kind: "post", url: "https://news.ycombinator.com/item?id=9", source: "their research" },
    ]);
    expect(links.map((l) => l.kind)).toEqual(["post", "x", "email", "github"]);
    expect(links.find((l) => l.kind === "email")?.url).toBe("mailto:hi@site.com");
  });

  it("offers a search only for what is missing", () => {
    const s = reachSearches("Acme", "Gab", new Set(["x"]));
    expect(s.map((x) => x.kind)).toEqual(["linkedin", "post"]);
  });
});
