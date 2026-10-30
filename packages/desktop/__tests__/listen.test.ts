// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";
import {
  isBrowserReadStep,
  keywordHits,
  listenDue,
  pagesFromTools,
  postsFromTree,
  type RawPost,
  shortlist,
} from "../src/shared/listen";

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

describe("reading pages with Claude in Chrome", () => {
  const tree = `main [ref_26]
  region [ref_54]
   generic "Timeline: Search timeline" [ref_56]
    article [ref_57]
     link [ref_59] href="/ahmedpbboateng"
      generic "Ahmed Boateng" [ref_60]
     link "2 minutes ago" [ref_64] href="/ahmedpbboateng/status/2115538018220011729"
     generic "We need a better CRM for our 4-person sales team, any tips?" [ref_68]
     group "1 repost, 12 views" [ref_70]
      button "0 Replies. Reply" [ref_71] type="button"
      link "12 views. View post analytics" [ref_74] href="/ahmedpbboateng/status/2115538018220011729/analytics"
 generic "Trending" [ref_58]`;

  it("keeps each post with its own link and drops the buttons", () => {
    const text = postsFromTree(tree, "x.com");
    expect(text).toContain("POST https://x.com/ahmedpbboateng/status/2115538018220011729\n");
    expect(text).toContain("We need a better CRM");
    expect(text).not.toContain("Reply");
    expect(text).not.toContain("Trending");
  });

  it("reads a LinkedIn post, linked to its author", () => {
    const li = `main [ref_84]
  listitem [ref_86]
   heading "Feed post" [ref_87]
    generic "Feed post" [ref_88]
   link [ref_92] href="https://www.linkedin.com/in/jeremy-bell/"
    generic "Jeremy Bell" [ref_94]
   button "Follow Jeremy Bell" [ref_99] type="button"
    generic "Follow" [ref_100]
   generic "We just took on two new clients and need a better way to find more." [ref_102]
  listitem [ref_112]`;
    const text = postsFromTree(li, "www.linkedin.com");
    expect(text).toContain("POST https://www.linkedin.com/in/jeremy-bell/\n");
    expect(text).toContain("We just took on");
    expect(text).not.toContain("Follow");
  });

  it("gives each read_page tree to the page the tab went to, also inside a batch", () => {
    const urls = ["https://x.com/search?q=a&f=live", "https://www.linkedin.com/feed/"];
    const pages = pagesFromTools(
      [
        '{"availableTabs":[]}',
        `[navigate] Navigated to ${urls[0]}\n[computer:wait] Waited for 4 seconds\n[read_page] ${tree}`,
        `Navigated to ${urls[1]}`,
        "Failed: Host access is restricted by policy.",
      ],
      urls
    );
    expect(pages[0]?.url).toBe(urls[0]);
    expect(pages[0]?.text).toContain("status/2115538018220011729");
    expect(pages[1]).toMatchObject({ url: urls[1], text: "" });
    expect(pages[1]?.error).toMatch(/restricted by policy/);
  });
});

describe("what Claude may do in the founder's browser", () => {
  const P = "mcp__claude-in-chrome__";
  it("allows reading the listed sites", () => {
    expect(isBrowserReadStep(`${P}read_page`, { filter: "all" })).toBe(true);
    expect(isBrowserReadStep(`${P}navigate`, { url: "https://x.com/search?q=a" })).toBe(true);
    expect(isBrowserReadStep(`${P}computer`, { action: "wait", duration: 4 })).toBe(true);
  });
  it("refuses clicks, typing, scripts and other sites", () => {
    expect(isBrowserReadStep(`${P}computer`, { action: "left_click" })).toBe(false);
    expect(isBrowserReadStep(`${P}javascript_tool`, { text: "1" })).toBe(false);
    expect(isBrowserReadStep(`${P}navigate`, { url: "https://mail.google.com/" })).toBe(false);
    expect(isBrowserReadStep(`${P}navigate`, { url: "https://x.com.evil.io/" })).toBe(false);
  });
});
