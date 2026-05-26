// SPDX-License-Identifier: MIT

import { CodePreview } from "./CodePreview";

export function Integration() {
  return (
    <section
      id="integration"
      aria-labelledby="integration-heading"
      className="mx-auto max-w-[1240px] px-6 pt-16 pb-12 md:px-12 md:pt-24 md:pb-20 lg:px-[72px]"
    >
      <div className="grid items-start gap-8 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
        <header>
          <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
            drop into your stack
          </span>
          <h2
            id="integration-heading"
            className="mt-3 text-[32px] font-semibold leading-[1.05] tracking-[-0.025em] text-[color:var(--text)] md:text-[44px]"
          >
            Real SDK. Async generator. No magic.
          </h2>
          <p className="mt-4 max-w-[440px] text-[16px] leading-[1.55] text-[color:var(--text-muted)]">
            One package. Two providers. Standard <code className="font-mono text-[14px]">for await</code>{" "}
            loop over a typed event stream. Works wherever Node 20 works.
          </p>
        </header>

        <CodePreview label="example.ts · @icpfinder/core" />
      </div>
    </section>
  );
}
