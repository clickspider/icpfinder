// SPDX-License-Identifier: MIT

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
        </div>
      </div>
    </footer>
  );
}
