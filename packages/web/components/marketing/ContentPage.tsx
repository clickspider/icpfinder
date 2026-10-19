// SPDX-License-Identifier: MIT

import type { ReactNode } from "react";
import { CONTENT_UPDATED, formatUpdated } from "../../lib/content";
import { Footer } from "./Footer";
import { Nav } from "./Nav";

interface ContentPageProps {
  eyebrow: string;
  title: string;
  lede: string;
  /** Optional JSON-LD object(s) for this page. */
  jsonLd?: object | object[];
  children: ReactNode;
}

/** Shared shell for long-form text pages: skip link, nav, dated header, prose, CTA, footer. */
export function ContentPage({ eyebrow, title, lede, jsonLd, children }: ContentPageProps) {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-[color:var(--bg-elev)] focus:px-4 focus:py-2 focus:text-sm focus:text-[color:var(--text)] focus:shadow-md"
      >
        Skip to main content
      </a>
      {jsonLd ? (
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD must be inline; content is static page data.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}
      <Nav />
      <main
        id="main"
        className="mx-auto w-full min-w-0 max-w-[760px] flex-1 px-5 pb-16 pt-10 sm:px-6 md:pt-16"
      >
        <header>
          <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
            {eyebrow}
          </span>
          <h1 className="mt-3 text-[34px] font-semibold leading-[1.1] tracking-[-0.025em] text-[color:var(--text)] md:text-[42px]">
            {title}
          </h1>
          <p className="mt-4 text-[17px] leading-[1.6] text-[color:var(--text)]">{lede}</p>
          <p className="mt-3 text-[13px] text-[color:var(--text-muted)]">
            Updated <time dateTime={CONTENT_UPDATED}>{formatUpdated()}</time>
          </p>
        </header>
        <div className="prose-icp mt-10">{children}</div>
        <aside className="mt-14 rounded-[20px] border border-[color:var(--hairline)] bg-[color:var(--bg-card)] p-6">
          <p className="text-[16px] font-semibold text-[color:var(--text)]">
            Try it on your own idea
          </p>
          <p className="mt-1 text-[14px] leading-[1.55] text-[color:var(--text)]">
            Paste a product description. Get 3 archetypes and verified emails in about 30 seconds.
            Free, no signup.
          </p>
          <a
            href="/find"
            className="mt-4 inline-flex h-10 items-center gap-2 rounded-full px-5 text-[14px] font-semibold text-white transition-transform hover:-translate-y-px"
            style={{
              background: "linear-gradient(95deg, var(--mint-deep), var(--iris-deep))",
              boxShadow: "0 0 0 1px rgba(255,255,255,0.5) inset, 0 8px 20px -6px var(--iris-glow)",
            }}
          >
            Find my ICP <span aria-hidden="true">→</span>
          </a>
        </aside>
      </main>
      <Footer />
    </>
  );
}
