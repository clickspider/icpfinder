// SPDX-License-Identifier: MIT

import { CodePreview } from "./CodePreview";
import { NpmInstallLine } from "./NpmInstallLine";
import { SocialProofStrip } from "./SocialProofStrip";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-12 pb-20 md:pt-16 md:pb-24">
      {/* Aurora glow — hero only, once per page */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute z-0"
        style={{
          right: "-10%",
          top: "-10%",
          width: "70%",
          height: "800px",
          filter: "blur(70px)",
          opacity: 0.7,
          background:
            "radial-gradient(ellipse 50% 50% at 50% 50%, var(--iris-glow), transparent 65%), radial-gradient(ellipse 50% 50% at 30% 70%, var(--mint-glow), transparent 65%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-[1240px] px-6 md:px-12 lg:px-[72px]">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <div>
            <h1
              className="font-semibold tracking-[-0.035em]"
              style={{ fontSize: "clamp(36px, 5.8vw, 72px)", lineHeight: 1.02 }}
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

            <p className="mt-6 max-w-[540px] text-[18px] leading-[1.55] text-[color:var(--text-muted)]">
              Paste your idea. Get three ICP archetypes and verified contact emails in thirty
              seconds. Free, MIT, no signup wall. Self-host the whole thing.
            </p>

            <NpmInstallLine />

            <div className="mt-7 flex flex-wrap items-center gap-2.5">
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

            <div className="mt-7 flex flex-wrap gap-5 text-[13px] font-medium text-[color:var(--text-muted)]">
              {[
                "30s end to end",
                "verified emails via Hunter",
                "self-hostable",
                "your keys, your costs",
              ].map((item) => (
                <span key={item} className="inline-flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ background: "var(--mint-deep)", boxShadow: "0 0 8px var(--mint-glow)" }}
                  />
                  {item}
                </span>
              ))}
            </div>

            <SocialProofStrip />
          </div>

          <div className="lg:pl-4">
            <CodePreview label="example.ts · @icpfinder/core" />
          </div>
        </div>
      </div>
    </section>
  );
}
