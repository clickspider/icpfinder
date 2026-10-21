// SPDX-License-Identifier: MIT
//
// `bun run research` — SDR account research for one company from the CLI.
// Prints a Markdown report: proven findings first, then weak/rejected ones
// with the reason, so a human can see exactly what is and is not backed.
//
// Usage:
//   bun run research -- --seller https://icpfinder.dev --company "Tally" --domain tally.so
//   bun run research -- --seller "AI tool that ..." --company Acme --domain acme.com \
//     --contact "Jane Doe" --role CEO --days 90 --json
//
// LLM: Gemini when GEMINI_API_KEY is set, else the local `claude -p`
// (Claude subscription). ICPFINDER_LLM=claude-cli forces Claude.

import {
  type AccountResearch,
  type Finding,
  htmlToText,
  researchAccount,
  safeFetch,
} from "@icpfinder/core";
import { ClaudeCliLlmProvider, GeminiLlmProvider, type LlmProvider } from "@icpfinder/providers";

const arg = (name: string): string | undefined => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

const seller = arg("seller");
const company = arg("company");
const domain = arg("domain");
if (!seller || !company || !domain) {
  console.error(
    'Usage: bun run research -- --seller <url|text> --company "<name>" --domain <domain>'
  );
  process.exit(1);
}

const pickLlm = (): LlmProvider => {
  const gemini = process.env.GEMINI_API_KEY?.trim();
  if (gemini && process.env.ICPFINDER_LLM !== "claude-cli") {
    return new GeminiLlmProvider({ apiKey: gemini, timeoutMs: 300_000 });
  }
  return new ClaudeCliLlmProvider({
    bin: process.env.ICPFINDER_CLAUDE_BIN,
    model: process.env.ICPFINDER_CLAUDE_MODEL,
  });
};

const sellerSummary = async (input: string): Promise<{ summary: string; url?: string }> => {
  if (!/^https:\/\//.test(input)) return { summary: input };
  try {
    const page = await safeFetch(input, { timeoutMs: 10_000 });
    return { summary: htmlToText(page.body).slice(0, 4_000), url: input };
  } catch {
    return { summary: input, url: input };
  }
};

const renderFinding = (f: Finding): string => {
  const head = `- **${f.claim}**${f.date ? ` _(${f.date})_` : ""}${f.why ? ` — ${f.why}` : ""}`;
  const ev = f.evidence.map((e) => `  - [${e.check}] ${e.url}\n    > ${e.quote}`).join("\n");
  return ev ? `${head}\n${ev}` : head;
};

const render = (r: AccountResearch): string => {
  const out: string[] = [`# ${r.company.name} (${r.company.domain})`, ""];
  out.push(`Researched ${r.researchedAt.slice(0, 10)}, why-now window ${r.windowDays} days.`);
  out.push(`Fit score: ${r.fitScore ?? "n/a (nothing proven)"}`, "");
  if (r.fitSummary.length) {
    out.push("## Fit", ...r.fitSummary.map((l) => `- ${l.text} [${l.citations.join(", ")}]`), "");
  }
  if (r.opener.length) {
    out.push("## Opener", r.opener.map((l) => l.text).join(" "), "");
  }
  const sections: Array<[string, Finding["kind"]]> = [
    ["Why now", "why_now"],
    ["Who", "person"],
    ["Their posts", "linkedin_post"],
    ["What they sell", "what_they_sell"],
    ["What they need", "their_need"],
    ["Tech stack", "tech_stack"],
    ["Disqualifiers", "disqualifier"],
  ];
  for (const status of ["proven", "weak", "rejected"] as const) {
    const group = r.findings.filter((f) => f.status === status);
    if (!group.length) continue;
    out.push(`## ${status.toUpperCase()} (${group.length})`);
    for (const [title, kind] of sections) {
      const items = group.filter((f) => f.kind === kind);
      if (items.length) out.push(`### ${title}`, ...items.map(renderFinding));
    }
    out.push("");
  }
  if (r.gaps.length) out.push("## Still to check by hand", ...r.gaps.map((g) => `- ${g}`));
  return out.join("\n");
};

const main = async (): Promise<void> => {
  const result = await researchAccount({
    llm: pickLlm(),
    seller: await sellerSummary(seller),
    company: { name: company, domain },
    contact: { name: arg("contact"), role: arg("role") },
    windowDays: Number(arg("days") ?? 120),
  });
  console.log(process.argv.includes("--json") ? JSON.stringify(result, null, 2) : render(result));
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
