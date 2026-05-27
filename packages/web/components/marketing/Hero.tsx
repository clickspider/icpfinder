// SPDX-License-Identifier: MIT

import { HeroSurface } from "./HeroSurface";

export function Hero() {
  return (
    <section className="relative isolate flex flex-1 flex-col justify-center overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28">
      {/* Aurora glow — hero only. Full bleed across the section so it reads as
          the dominant brand atmosphere on first paint. Strong multi-stop radial
          field with extra saturation in dark mode (coral + mint + iris). */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          filter: "blur(110px)",
          opacity: 1,
          background: [
            "radial-gradient(ellipse 65% 70% at 15% 20%, var(--iris-glow), transparent 65%)",
            "radial-gradient(ellipse 70% 70% at 85% 15%, var(--mint-glow), transparent 65%)",
            "radial-gradient(ellipse 60% 65% at 80% 85%, var(--coral-glow), transparent 65%)",
            "radial-gradient(ellipse 55% 60% at 20% 90%, var(--mint-glow), transparent 65%)",
            "radial-gradient(ellipse 80% 55% at 50% 50%, var(--iris-glow), transparent 70%)",
          ].join(", "),
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 0%, color-mix(in srgb, var(--bg) 0%, transparent), transparent 70%), linear-gradient(180deg, transparent 60%, color-mix(in srgb, var(--bg) 80%, transparent) 100%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-[1240px] px-5 sm:px-6 md:px-12 lg:px-[72px]">
        <div className="mx-auto flex flex-col items-center text-center">
          <h1
            className="font-semibold tracking-[-0.04em] text-[color:var(--text)]"
            style={{
              fontSize: "clamp(40px, 8.5vw, 88px)",
              lineHeight: 1.0,
              maxWidth: "14ch",
            }}
          >
            Find who'll pay for{" "}
            <span
              style={{
                background:
                  "linear-gradient(110deg, var(--mint-deep) 0%, var(--iris-deep) 55%, var(--coral) 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              your idea.
            </span>
          </h1>

          <p className="mt-5 max-w-[460px] text-[16px] text-[color:var(--text-muted)] md:mt-6 md:text-[18px]">
            3 ICPs + verified emails. 30 seconds. Free. MIT.
          </p>
        </div>

        <div className="mt-9 w-full md:mt-12">
          <HeroSurface />
        </div>
      </div>
    </section>
  );
}
