// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";
import robots from "../app/robots";
import sitemap from "../app/sitemap";
import { CONTENT_UPDATED, FAQS, formatUpdated } from "../lib/content";
import { faqJsonLd } from "../lib/content-jsonld";
import { AI_CRAWLERS } from "../lib/site";

describe("robots", () => {
  it("allows every named AI crawler on public pages", () => {
    const rules = [robots().rules].flat();
    for (const bot of AI_CRAWLERS) {
      const rule = rules.find((r) => [r.userAgent].flat().includes(bot));
      expect(rule?.allow).toBe("/");
    }
  });
});

describe("sitemap", () => {
  it("lists the text pages", () => {
    const urls = sitemap().map((e) => e.url);
    for (const path of [
      "/guides/find-your-icp",
      "/guides/icp-vs-buyer-persona",
      "/alternatives",
      "/faq",
    ]) {
      expect(urls).toContain(`https://icpfinder.dev${path}`);
    }
  });
});

describe("content", () => {
  it("formats the visible updated date as month + year", () => {
    expect(formatUpdated("2026-10-19")).toBe("Oct 2026");
    expect(CONTENT_UPDATED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("builds a FAQPage with one Question per FAQ", () => {
    const ld = faqJsonLd(FAQS);
    expect(ld["@type"]).toBe("FAQPage");
    expect(ld.mainEntity).toHaveLength(FAQS.length);
  });
});
