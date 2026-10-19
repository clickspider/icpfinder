// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";
import { GET } from "../app/llms.txt/route";
import { makerLink, siteJsonLd } from "../lib/site";

describe("/llms.txt", () => {
  it("serves plain text with the core links", async () => {
    const res = GET();
    expect(res.headers.get("content-type")).toContain("text/plain");
    const text = await res.text();
    expect(text.startsWith("# icpfinder")).toBe(true);
    expect(text).toContain("https://icpfinder.dev/find");
    expect(text).toContain("https://github.com/clickspider/icpfinder");
  });
});

describe("siteJsonLd", () => {
  it("is a valid schema.org graph with a free SoftwareApplication", () => {
    const ld = siteJsonLd();
    const json = JSON.parse(JSON.stringify(ld));
    expect(json["@context"]).toBe("https://schema.org");
    const app = json["@graph"].find(
      (n: { "@type": string }) => n["@type"] === "SoftwareApplication"
    );
    expect(app.isAccessibleForFree).toBe(true);
    expect(app.offers.price).toBe("0");
  });
});

describe("makerLink", () => {
  it("adds utm tags without dropping the path", () => {
    const url = new URL(makerLink("https://danielfrey.me/lore/", "footer-lore"));
    expect(url.pathname).toBe("/lore/");
    expect(url.searchParams.get("utm_source")).toBe("icpfinder");
    expect(url.searchParams.get("utm_content")).toBe("footer-lore");
  });
});
