// SPDX-License-Identifier: MIT

import { DemoCard } from "./DemoCard";
import { SocialProofStrip } from "./SocialProofStrip";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-12 pb-20 md:pt-16 md:pb-24">
      {/* Aurora glow — hero only, once per page per plan slop rules */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute z-0"
        style={{
          right: "-10%",
          top: "-10%",
          width: "70%",
          height: "800px",
          filter: "blur(70px)",
          opacity: 0.75,
          background:
            "radial-gradient(ellipse 50% 50% at 50% 50%, var(--iris-glow), transparent 65%), radial-gradient(ellipse 50% 50% at 30% 70%, var(--mint-glow), transparent 65%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-[1240px] px-6 md:px-12 lg:px-[72px]">
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <div>
            <div
              className="mb-7 inline-flex items-center gap-3 rounded-full border border-[color:var(--hairline-2)] bg-[color:var(--bg-elev)] py-1.5 pl-1.5 pr-3.5 text-[13px] font-medium text-[color:var(--text-muted)]"
              style={{ boxShadow: "0 4px 12px -4px var(--iris-glow)" }}
            >
              <span
                className="rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white"
                style={{ background: "linear-gradient(90deg, var(--mint-deep), var(--iris-deep))" }}
              >
                v0.1
              </span>
              shipped · streaming live · MIT
            </div>

            <h1
              className="font-semibold tracking-[-0.035em]"
              style={{ fontSize: "clamp(36px, 5.8vw, 72px)", lineHeight: 1.0 }}
            >
              find the people who will pay for{" "}
              <span
                style={{
                  background:
                    "linear-gradient(110deg, var(--mint-deep) 0%, var(--iris-deep) 60%, var(--coral) 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                your idea.
              </span>
            </h1>

            <p className="mt-7 max-w-[540px] text-[18px] leading-[1.55] text-[color:var(--text-muted)]">
              Paste your idea. Get three ICP archetypes and verified contact emails in thirty
              seconds. Free, open source, no signup wall.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-2.5">
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

            <div className="mt-8 flex flex-wrap gap-6 text-[13px] font-medium text-[color:var(--text-muted)]">
              {["30s end to end", "verified emails via Hunter", "self-hostable", "your keys, your costs"].map(
                (item) => (
                  <span key={item} className="inline-flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="inline-block h-1.5 w-1.5 rounded-full"
                      style={{ background: "var(--mint-deep)", boxShadow: "0 0 8px var(--mint-glow)" }}
                    />
                    {item}
                  </span>
                ),
              )}
            </div>

            <SocialProofStrip />
          </div>

          <div className="lg:pl-4">
            <DemoCard />
          </div>
        </div>
      </div>
    </section>
  );
}
