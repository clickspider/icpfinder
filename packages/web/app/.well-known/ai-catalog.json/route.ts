// SPDX-License-Identifier: MIT
//
// /.well-known/ai-catalog.json — one list of every agent-facing resource
// (AgentReady AR-FIND-04). Linked from <head> and a Link header on "/".
// Add an entry here whenever a new agent surface (MCP, OpenAPI) ships.

import { CONTENT_UPDATED } from "../../../lib/content";
import { NPM_URL, REPO_URL, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "../../../lib/site";

export const dynamic = "force-static";

const catalog = {
  name: SITE_NAME,
  description: SITE_DESCRIPTION,
  url: SITE_URL,
  updated: CONTENT_UPDATED,
  resources: [
    { type: "llms-txt", url: `${SITE_URL}/llms.txt`, description: "Described index of key pages" },
    { type: "sitemap", url: `${SITE_URL}/sitemap.xml` },
    { type: "docs", url: `${SITE_URL}/faq`, markdown: `${SITE_URL}/faq.md`, description: "FAQ" },
    {
      type: "docs",
      url: `${SITE_URL}/pricing`,
      markdown: `${SITE_URL}/pricing.md`,
      description: "Pricing, free tier and limits",
    },
    {
      type: "docs",
      url: `${SITE_URL}/guides/find-your-icp`,
      description: "How to find your ICP as a solo founder",
    },
    { type: "app", url: `${SITE_URL}/find`, description: "Run an ICP search in the browser" },
    {
      type: "mcp",
      url: `${SITE_URL}/mcp`,
      transport: "streamable-http",
      description: "MCP server with a find_icp tool; no auth for free demo runs",
    },
    { type: "sdk", url: NPM_URL, description: "@icpfinder/core, the streaming engine" },
    { type: "source", url: REPO_URL, description: "MIT-licensed source code" },
  ],
};

export function GET() {
  return Response.json(catalog);
}
