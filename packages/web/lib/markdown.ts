// SPDX-License-Identifier: MIT
//
// Markdown mirrors of the data-driven text pages (AgentReady AR-READ-09).
// Built from the same data as the HTML pages, so the facts cannot drift.

import { CONTENT_UPDATED, FAQS, KEY_FACTS, PLANS, PRICING_UPDATED } from "./content";
import { SITE_URL } from "./site";

export function faqMarkdown(): string {
  return `# icpfinder FAQ

Updated: ${CONTENT_UPDATED}
Canonical: ${SITE_URL}/faq

## Key facts

${KEY_FACTS.map((f) => `- ${f}`).join("\n")}

${FAQS.map((f) => `## ${f.q}\n\n${f.a}`).join("\n\n")}
`;
}

export function pricingMarkdown(): string {
  return `# icpfinder pricing

Updated: ${PRICING_UPDATED}
Canonical: ${SITE_URL}/pricing

icpfinder costs nothing. There are no paid plans and no signup.

${PLANS.map(
  (p) =>
    `## ${p.name}\n\n- Price: ${p.price}\n- For: ${p.forWho}\n${p.limits.map((l) => `- ${l}`).join("\n")}`
).join("\n\n")}

Cost of each provider call: https://github.com/clickspider/icpfinder/blob/main/docs/costs.md
`;
}

export function markdownResponse(body: string): Response {
  return new Response(body, {
    headers: { "content-type": "text/markdown; charset=utf-8" },
  });
}
