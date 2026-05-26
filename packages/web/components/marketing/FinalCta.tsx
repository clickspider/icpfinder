// SPDX-License-Identifier: MIT

export function FinalCta() {
  return (
    <section
      aria-labelledby="final-cta-heading"
      className="border-t border-[color:var(--hairline)]"
    >
      <div className="mx-auto flex max-w-[1240px] flex-col items-center gap-6 px-6 py-20 text-center md:py-24 lg:px-[72px]">
        <h2
          id="final-cta-heading"
          className="max-w-[760px] text-[28px] font-semibold leading-[1.1] tracking-[-0.025em] text-[color:var(--text)] md:text-[40px]"
        >
          Try it free. Real query, real archetypes, real emails in thirty seconds.
        </h2>
        <p className="max-w-[520px] text-[15px] text-[color:var(--text-muted)]">
          No signup. No credit card. One archetype + three verified contacts on the house. Add your
          own Gemini + Hunter keys for unlimited runs.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <a
            href="/find"
            className="inline-flex h-12 items-center gap-2 rounded-full px-6 text-[15px] font-semibold tracking-[-0.005em] text-white transition-transform hover:-translate-y-px active:scale-[0.97]"
            style={{
              background: "linear-gradient(95deg, var(--mint-deep), var(--iris-deep))",
              boxShadow:
                "0 0 0 1px rgba(255,255,255,0.5) inset, 0 14px 32px -10px var(--iris-glow)",
            }}
          >
            Try it now <span aria-hidden="true">→</span>
          </a>
          <a
            href="https://github.com/clickspider/icpfinder"
            className="inline-flex h-12 items-center gap-2 rounded-full border border-[color:var(--hairline-2)] bg-[color:var(--bg-elev)] px-6 text-[15px] font-semibold text-[color:var(--text)] transition-colors hover:bg-[color:var(--bg-card-hi)]"
          >
            github
          </a>
        </div>
      </div>
    </section>
  );
}
