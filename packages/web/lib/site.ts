// SPDX-License-Identifier: MIT
//
// Single source for public site facts used by metadata, JSON-LD,
// /llms.txt and the footer. Keep every string here generic and public.

export const SITE_URL = "https://icpfinder.dev";
export const SITE_NAME = "icpfinder";
export const SITE_TAGLINE = "find your ICP in 30 seconds";
export const SITE_DESCRIPTION =
  "Paste your product idea. Stream three buyer archetypes + 15 lookalike companies with verified contact emails. Open source, MIT, self-host.";

export const REPO_URL = "https://github.com/clickspider/icpfinder";
export const NPM_URL = "https://www.npmjs.com/package/@icpfinder/core";

export const MAKER = {
  name: "Daniel Frey",
  url: "https://danielfrey.me",
  github: "https://github.com/clickspider",
} as const;

// AI crawlers and answer engines, allowed by name in robots.txt so a future
// "*" change cannot block them by accident.
export const AI_CRAWLERS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "PerplexityBot",
  "Perplexity-User",
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "Google-Extended",
  "Applebot-Extended",
] as const;

export const LORE_URL = "https://danielfrey.me/lore/";

/** Outbound link to the maker's sites, tagged so danielfrey.me analytics can attribute it. */
export function makerLink(url: string, content: string): string {
  const u = new URL(url);
  u.searchParams.set("utm_source", "icpfinder");
  u.searchParams.set("utm_medium", "referral");
  u.searchParams.set("utm_content", content);
  return u.toString();
}

/** schema.org graph for the root layout. Helps search engines and AI answer engines cite the tool. */
export function siteJsonLd() {
  const maker = {
    "@type": "Person",
    "@id": `${MAKER.url}/#person`,
    name: MAKER.name,
    url: MAKER.url,
    sameAs: [MAKER.github],
  };
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        publisher: { "@id": maker["@id"] },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${SITE_URL}/#app`,
        name: SITE_NAME,
        url: SITE_URL,
        description: SITE_DESCRIPTION,
        applicationCategory: "BusinessApplication",
        applicationSubCategory: "Customer discovery / ideal customer profile (ICP) finder",
        operatingSystem: "Web",
        isAccessibleForFree: true,
        license: "https://opensource.org/licenses/MIT",
        codeRepository: REPO_URL,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        author: { "@id": maker["@id"] },
        creator: { "@id": maker["@id"] },
        sameAs: [REPO_URL, NPM_URL],
      },
      maker,
    ],
  };
}
