// SPDX-License-Identifier: MIT

import { LORE_URL, MAKER, makerLink } from "../../lib/site";
import { Wordmark } from "../brand/Wordmark";

export function Footer() {
  return (
    <footer className="border-t border-[color:var(--hairline)]">
      <div className="mx-auto flex max-w-[1240px] flex-col items-start justify-between gap-5 px-5 py-8 sm:flex-row sm:items-center sm:px-6 md:px-12 lg:px-[72px]">
        <Wordmark href="/" size={22} />
        <div className="flex flex-wrap gap-5 text-[13px] text-[color:var(--text-muted)]">
          <a
            href="https://github.com/clickspider/icpfinder"
            className="hover:text-[color:var(--text)] transition-colors"
          >
            github
          </a>
          <a
            href="https://www.npmjs.com/package/@icpfinder/core"
            className="hover:text-[color:var(--text)] transition-colors"
          >
            npm
          </a>
          <a
            href="https://github.com/clickspider/icpfinder/issues"
            className="hover:text-[color:var(--text)] transition-colors"
          >
            issues
          </a>
          <a href="/roadmap" className="hover:text-[color:var(--text)] transition-colors">
            roadmap
          </a>
          <a href="/find#keys" className="hover:text-[color:var(--text)] transition-colors">
            keys
          </a>
          <a
            href="/guides/find-your-icp"
            className="hover:text-[color:var(--text)] transition-colors"
          >
            guide
          </a>
          <a href="/alternatives" className="hover:text-[color:var(--text)] transition-colors">
            alternatives
          </a>
          <a href="/faq" className="hover:text-[color:var(--text)] transition-colors">
            faq
          </a>
          <a href="/llms.txt" className="hover:text-[color:var(--text)] transition-colors">
            llms.txt
          </a>
        </div>
        <p className="text-[13px] text-[color:var(--text-muted)]">
          built by{" "}
          <a
            href={makerLink(MAKER.url, "footer")}
            rel="author"
            className="hover:text-[color:var(--text)] transition-colors underline-offset-2 hover:underline"
          >
            {MAKER.name}
          </a>
          {" · also: "}
          <a
            href={makerLink(LORE_URL, "footer-lore")}
            className="hover:text-[color:var(--text)] transition-colors underline-offset-2 hover:underline"
          >
            Lore, a second brain for your Mac
          </a>
        </p>
      </div>
    </footer>
  );
}
