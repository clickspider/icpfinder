// SPDX-License-Identifier: MIT

import { CopyCodeButton } from "./CopyCodeButton";

// Hand-tokenized TypeScript snippet. Pre-rendered at build time (RSC).
// Zero client JS for the highlight itself; CopyCodeButton ships only the
// clipboard handler. Tokens map to design tokens via CSS variables.
//
// IRON RULE: this snippet must match the real exported API surface. A
// vitest case in packages/web/__tests__/code-preview-snippet.test.ts imports
// the same names and instantiates IcpFinder with stub providers. If the
// snippet drifts from the API, the test fails.

const RAW = `import { IcpFinder } from "@icpfinder/core";
import {
  GeminiLlmProvider,
  HunterEmailProvider,
} from "@icpfinder/providers";

const finder = new IcpFinder({
  llm: new GeminiLlmProvider({ apiKey: process.env.GEMINI_API_KEY }),
  email: new HunterEmailProvider({ apiKey: process.env.HUNTER_API_KEY }),
});

for await (const event of finder.find({
  seed: "AI invoicing for indie SaaS",
})) {
  if (event.type === "archetype") {
    console.log(event.archetype.role);
  } else if (event.type === "candidate") {
    console.log(event.candidate.contactEmail);
  }
}`;

interface CodePreviewProps {
  className?: string;
  label?: string;
}

interface Token {
  text: string;
  cls?: string;
}

// Minimal classifier: keyword | string | comment | identifier (default).
// Good enough for a 20-line TypeScript snippet, no Shiki bundle cost.
function tokenize(line: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  const isIdentStart = (c: string) => /[A-Za-z_$]/.test(c);
  const isIdent = (c: string) => /[A-Za-z0-9_$]/.test(c);

  while (i < line.length) {
    const c = line[i] ?? "";

    if (c === "/" && line[i + 1] === "/") {
      out.push({ text: line.slice(i), cls: "token-comment" });
      break;
    }

    if (c === '"' || c === "'" || c === "`") {
      const quote = c;
      let j = i + 1;
      while (j < line.length && line[j] !== quote) {
        if (line[j] === "\\") j += 1;
        j += 1;
      }
      out.push({ text: line.slice(i, j + 1), cls: "token-string" });
      i = j + 1;
      continue;
    }

    if (isIdentStart(c)) {
      let j = i + 1;
      while (j < line.length && isIdent(line[j] ?? "")) j += 1;
      const word = line.slice(i, j);
      const keywords = new Set([
        "import",
        "from",
        "const",
        "let",
        "var",
        "function",
        "return",
        "for",
        "of",
        "await",
        "async",
        "if",
        "else",
        "new",
        "type",
        "typeof",
        "export",
      ]);
      const builtins = new Set(["console", "process"]);
      if (keywords.has(word)) {
        out.push({ text: word, cls: "token-keyword" });
      } else if (builtins.has(word)) {
        out.push({ text: word, cls: "token-builtin" });
      } else if (word[0] && word[0] >= "A" && word[0] <= "Z") {
        out.push({ text: word, cls: "token-type" });
      } else {
        out.push({ text: word });
      }
      i = j;
      continue;
    }

    out.push({ text: c });
    i += 1;
  }
  return out;
}

export function CodePreview({ className, label }: CodePreviewProps) {
  const lines = RAW.split("\n");
  return (
    <figure
      className={`overflow-hidden rounded-[20px] border border-[color:var(--hairline)] bg-[color:var(--bg-card)] ${className ?? ""}`}
      style={{ boxShadow: "0 24px 60px -28px rgba(15,16,20,0.18)" }}
    >
      <figcaption className="flex items-center justify-between gap-3 border-b border-[color:var(--hairline)] bg-[color:var(--bg-card-hi)] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="text-[color:var(--mint-deep)]">
            ts
          </span>
          <span>{label ?? "example · @icpfinder/core"}</span>
        </span>
        <CopyCodeButton code={RAW} ariaLabel="Copy example code" />
      </figcaption>
      <pre
        aria-label="TypeScript example using @icpfinder/core"
        className="overflow-x-auto px-4 py-4 text-[13px] leading-[1.55] tabular"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        <code>
          {lines.map((line, idx) => (
            <div key={`${idx}-${line}`} className="flex gap-4">
              <span
                aria-hidden="true"
                className="select-none text-right text-[color:var(--text-dim)] tabular"
                style={{ minWidth: "1.5rem" }}
              >
                {idx + 1}
              </span>
              <span className="whitespace-pre">
                {tokenize(line).map((t, j) => (
                  <span key={`${idx}-${j}-${t.text}`} className={t.cls ?? ""}>
                    {t.text}
                  </span>
                ))}
              </span>
            </div>
          ))}
        </code>
      </pre>
    </figure>
  );
}
