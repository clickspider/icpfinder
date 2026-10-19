// SPDX-License-Identifier: MIT
//
// Copy for the text pages (guides, alternatives, FAQ). Kept as data so the
// pages, JSON-LD and /llms.txt quote the same facts. Every number here must
// match the product: 3 archetypes, up to 5 verified emails per archetype
// (15 per run), ~30s, Hunter free plan 25 searches/month. See docs/costs.md.

/** Shown as "Updated Oct 2026" on every text page. Bump when copy changes. */
export const CONTENT_UPDATED = "2026-10-19";

export function formatUpdated(iso: string = CONTENT_UPDATED): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export const KEY_FACTS = [
  "3 ICP archetypes per run, each with role, pain, selling angle and objections",
  "Up to 5 verified contact emails per archetype (15 per run)",
  "About 30 seconds from product idea to first archetype",
  "Free demo runs, no signup; bring your own Gemini + Hunter keys for unlimited runs",
  "Hunter's free plan covers 25 domain searches a month",
  "MIT licensed: self-host it or use @icpfinder/core in your own code",
] as const;

export interface Faq {
  q: string;
  a: string;
}

export const FAQS: Faq[] = [
  {
    q: "What is icpfinder?",
    a: "icpfinder is a free, open-source ideal customer profile (ICP) finder. You describe a product or paste its URL. It returns 3 buyer archetypes, real lookalike companies for each, and verified contact emails, in about 30 seconds.",
  },
  {
    q: "Is icpfinder free?",
    a: "Yes. Demo runs on icpfinder.dev are free and need no signup. For unlimited runs, paste your own Google Gemini key (free) and Hunter.io key (free plan: 25 searches a month). You only pay Google or Hunter if you go past their free tiers.",
  },
  {
    q: "What do I get from one run?",
    a: "Three archetypes. Each has a buyer role, the pain they feel, a selling angle, likely objections and 3 to 8 real example companies. Pick an archetype and icpfinder finds up to 5 verified emails at those companies, with a short outreach opener you can copy.",
  },
  {
    q: "How is this different from asking ChatGPT for my ICP?",
    a: "A chat prompt gives you text. icpfinder gives you real company domains checked against Hunter, verified emails and a cost per run, in a repeatable format. The output is structured, so you can compare archetypes side by side.",
  },
  {
    q: "Is icpfinder an Apollo or Clay alternative?",
    a: "For the first step, yes. Apollo and Clay are built for sales teams with a defined ICP and a budget. icpfinder is for the step before that: a solo founder who does not know yet who will pay. See the comparison on the alternatives page.",
  },
  {
    q: "Where do my API keys go?",
    a: "Keys stay in your browser memory by default. They are sent with each request and passed on to Google and Hunter, and they are never logged or saved on icpfinder's servers. If you tick 'Remember on this device', they are saved in your browser's localStorage.",
  },
  {
    q: "Can I self-host it?",
    a: "Yes. The code is MIT licensed on GitHub. Clone the repo, add your keys, and run it with Bun. Self-hosted copies send no analytics.",
  },
];

export interface ComparisonRow {
  label: string;
  icpfinder: string;
  apollo: string;
  clay: string;
  chatgpt: string;
}

export const COMPARISON: ComparisonRow[] = [
  {
    label: "Best for",
    icpfinder: "Finding who will pay for a new idea",
    apollo: "Prospecting when you already know your ICP",
    clay: "Enriching and scoring lead lists at scale",
    chatgpt: "Brainstorming in free text",
  },
  {
    label: "Input",
    icpfinder: "One product description or URL",
    apollo: "Filters: title, industry, size, location",
    clay: "A table of companies or people",
    chatgpt: "A prompt you write",
  },
  {
    label: "Output",
    icpfinder: "3 archetypes, real companies, up to 15 verified emails",
    apollo: "Contact lists and sequences",
    clay: "Enriched rows from many data providers",
    chatgpt: "Text; companies and emails are not verified",
  },
  {
    label: "Time to first result",
    icpfinder: "About 30 seconds",
    apollo: "Minutes, after you set filters",
    clay: "Minutes to hours, after you build a table",
    chatgpt: "Seconds",
  },
  {
    label: "Price",
    icpfinder: "Free; optional own keys",
    apollo: "Free tier, then paid seats and credits",
    clay: "Free tier, then paid credit plans",
    chatgpt: "Free or subscription",
  },
  {
    label: "Open source",
    icpfinder: "Yes, MIT",
    apollo: "No",
    clay: "No",
    chatgpt: "No",
  },
];
