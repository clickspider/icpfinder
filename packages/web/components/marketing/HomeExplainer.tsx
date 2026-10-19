// SPDX-License-Identifier: MIT

import { FAQS, KEY_FACTS } from "../../lib/content";

const STEPS = [
  "Describe your product or paste its URL.",
  "Get 3 ICP archetypes: buyer role, pain, selling angle, objections and real example companies.",
  "Pick one. icpfinder finds up to 5 verified emails at those companies.",
  "Copy a short opener and start talking to real buyers.",
];

/** Plain-text section under the hero so people and answer engines can read what the tool does. */
export function HomeExplainer() {
  return (
    <section
      aria-labelledby="how-it-works"
      className="mx-auto grid w-full max-w-[920px] gap-12 px-5 pb-20 sm:px-6 md:grid-cols-2 md:px-12"
    >
      <div>
        <h2
          id="how-it-works"
          className="text-[24px] font-semibold tracking-[-0.015em] text-[color:var(--text)]"
        >
          How it works
        </h2>
        <ol className="mt-4 grid gap-3 text-[15px] leading-[1.6] text-[color:var(--text)]">
          {STEPS.map((step, i) => (
            <li key={step} className="flex gap-3">
              <span className="tabular mt-[2px] inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[color:var(--hairline-2)] text-[12px] font-semibold">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <ul className="mt-6 grid gap-2 text-[14px] leading-[1.55] text-[color:var(--text)]">
          {KEY_FACTS.map((fact) => (
            <li key={fact} className="flex gap-2.5">
              <span
                aria-hidden="true"
                className="mt-[8px] h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--mint-deep)]"
              />
              <span>{fact}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h2 className="text-[24px] font-semibold tracking-[-0.015em] text-[color:var(--text)]">
          Questions
        </h2>
        <div className="mt-4 grid gap-2">
          {FAQS.slice(0, 5).map((f) => (
            <details
              key={f.q}
              className="rounded-[14px] border border-[color:var(--hairline)] bg-[color:var(--bg-card)] px-4 py-3"
            >
              <summary className="cursor-pointer text-[15px] font-medium text-[color:var(--text)]">
                {f.q}
              </summary>
              <p className="mt-2 text-[14px] leading-[1.6] text-[color:var(--text)]">{f.a}</p>
            </details>
          ))}
        </div>
        <p className="mt-4 text-[14px] text-[color:var(--text-muted)]">
          More:{" "}
          <a href="/faq" className="underline underline-offset-2 hover:text-[color:var(--text)]">
            FAQ
          </a>{" "}
          ·{" "}
          <a
            href="/guides/find-your-icp"
            className="underline underline-offset-2 hover:text-[color:var(--text)]"
          >
            how to find your ICP
          </a>{" "}
          ·{" "}
          <a
            href="/alternatives"
            className="underline underline-offset-2 hover:text-[color:var(--text)]"
          >
            vs Apollo and Clay
          </a>
        </p>
      </div>
    </section>
  );
}
