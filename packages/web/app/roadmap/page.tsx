// SPDX-License-Identifier: MIT

import type { Metadata } from "next";
import { Footer } from "../../components/marketing/Footer";
import { Nav } from "../../components/marketing/Nav";
import { loadRoadmap } from "../../lib/roadmap";

export const metadata: Metadata = {
  title: "icpfinder — roadmap",
  description: "What's shipped, what's next, what's deferred. Open in public.",
};

const PRIORITY_COLORS: Record<string, { fg: string; bg: string }> = {
  P0: { fg: "var(--error)", bg: "color-mix(in srgb, var(--error) 10%, transparent)" },
  P1: { fg: "var(--coral)", bg: "color-mix(in srgb, var(--coral) 12%, transparent)" },
  P2: { fg: "var(--iris-deep)", bg: "color-mix(in srgb, var(--iris-deep) 12%, transparent)" },
  P3: { fg: "var(--mint-deep)", bg: "color-mix(in srgb, var(--mint-deep) 12%, transparent)" },
  P4: { fg: "var(--text-muted)", bg: "var(--bg-card-hi)" },
};

export default async function RoadmapPage() {
  const { sections, completed } = await loadRoadmap();

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-[color:var(--bg-elev)] focus:px-4 focus:py-2 focus:text-sm focus:text-[color:var(--text)] focus:shadow-md"
      >
        Skip to main content
      </a>
      <Nav />

      <main
        id="main"
        className="mx-auto grid w-full max-w-[920px] flex-1 gap-10 px-5 pb-16 pt-10 sm:px-6 md:px-12 md:pt-16 lg:px-[72px]"
      >
        <header>
          <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
            roadmap
          </span>
          <h1 className="mt-3 text-[36px] font-semibold tracking-[-0.025em] text-[color:var(--text)] md:text-[44px]">
            What's{" "}
            <span
              style={{
                background:
                  "linear-gradient(110deg, var(--mint-deep) 0%, var(--iris-deep) 55%, var(--coral) 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              shipped & next.
            </span>
          </h1>
          <p className="mt-3 max-w-[560px] text-[15px] text-[color:var(--text-muted)]">
            Generated from{" "}
            <a
              href="https://github.com/clickspider/icpfinder/blob/main/TODOS.md"
              className="text-[color:var(--mint-deep)] hover:underline"
            >
              TODOS.md
            </a>{" "}
            at build time. P0 → blocker, P4 → someday. Want it sooner?{" "}
            <a
              href="https://github.com/clickspider/icpfinder/issues"
              className="text-[color:var(--mint-deep)] hover:underline"
            >
              Open an issue
            </a>{" "}
            or PR.
          </p>
        </header>

        {sections.length === 0 ? (
          <p className="text-[color:var(--text-muted)]">
            Roadmap is empty for the moment — that&apos;s the perk of building in public on day one.
          </p>
        ) : (
          sections.map((section) => (
            <section key={section.heading} aria-labelledby={`section-${section.heading}`}>
              <h2
                id={`section-${section.heading}`}
                className="text-[20px] font-semibold tracking-[-0.015em] text-[color:var(--text)]"
              >
                {section.heading}
              </h2>
              <ul className="mt-4 grid gap-3">
                {section.items.map((item) => {
                  const tone = item.priority ? PRIORITY_COLORS[item.priority] : null;
                  return (
                    <li
                      key={item.title}
                      className="rounded-[14px] border border-[color:var(--hairline)] bg-[color:var(--bg-card)] p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h3 className="text-[15px] font-semibold tracking-[-0.005em] text-[color:var(--text)]">
                          {item.title}
                        </h3>
                        {item.priority && tone ? (
                          <span
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.1em] tabular"
                            style={{ color: tone.fg, background: tone.bg }}
                          >
                            {item.priority}
                          </span>
                        ) : null}
                      </div>
                      {item.description ? (
                        <p className="mt-2 whitespace-pre-line text-[13.5px] leading-[1.55] text-[color:var(--text-muted)]">
                          {item.description}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}

        {completed.length > 0 ? (
          <section aria-labelledby="section-completed">
            <h2
              id="section-completed"
              className="text-[20px] font-semibold tracking-[-0.015em] text-[color:var(--text)]"
            >
              Shipped
            </h2>
            <ul className="mt-4 grid gap-2">
              {completed.map((item) => (
                <li
                  key={item.title}
                  className="rounded-[12px] border border-[color:var(--hairline)] bg-[color:var(--bg-card-hi)] p-3"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-[14px] font-medium text-[color:var(--text)]">
                      {item.title}
                    </span>
                    {item.completedTag ? (
                      <span className="text-[12px] text-[color:var(--mint-deep)] tabular">
                        ✓ {item.completedTag}
                      </span>
                    ) : (
                      <span className="text-[12px] text-[color:var(--mint-deep)]">✓</span>
                    )}
                  </div>
                  {item.description ? (
                    <p className="mt-1 text-[12.5px] leading-[1.55] text-[color:var(--text-muted)]">
                      {item.description}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>

      <Footer />
    </>
  );
}
