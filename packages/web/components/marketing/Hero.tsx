// SPDX-License-Identifier: MIT

import { HeroChat } from "./HeroChat";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28">
      {/* Aurora glow — hero only. Bigger + more saturated than v0.1 to read as
          the dominant brand atmosphere on first paint. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-0 mx-auto"
        style={{
          maxWidth: "1600px",
          height: "900px",
          filter: "blur(90px)",
          opacity: 0.85,
          background: [
            "radial-gradient(ellipse 45% 55% at 25% 30%, var(--iris-glow), transparent 60%)",
            "radial-gradient(ellipse 45% 55% at 75% 25%, var(--mint-glow), transparent 60%)",
            "radial-gradient(ellipse 40% 45% at 50% 65%, var(--coral-glow), transparent 60%)",
          ].join(", "),
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

          <div className="mt-9 w-full md:mt-12">
            <HeroChat />
          </div>
        </div>
      </div>
    </section>
  );
}
