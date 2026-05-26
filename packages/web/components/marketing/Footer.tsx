// SPDX-License-Identifier: MIT

import { Logo } from "../brand/Logo";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-[color:var(--hairline)]">
      <div className="mx-auto flex max-w-[1240px] flex-col items-start justify-between gap-6 px-6 py-12 md:flex-row md:items-center md:px-12 lg:px-[72px]">
        <div className="flex flex-col items-start gap-1 text-[color:var(--text-muted)]">
          <div className="flex items-center gap-3">
            <Logo size={24} />
            <span className="text-[14px]">
              ( icpfinder · MIT · <span className="tabular">v0.1</span> · PRs welcome )
            </span>
          </div>
          <span className="text-[12px] text-[color:var(--text-dim)]">
            built in public · roadmap in{" "}
            <a
              href="https://github.com/clickspider/icpfinder/blob/main/TODOS.md"
              className="hover:text-[color:var(--text-muted)] transition-colors"
            >
              TODOS.md
            </a>
          </span>
        </div>
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
          <a href="/find" className="hover:text-[color:var(--text)] transition-colors">
            try it
          </a>
        </div>
      </div>
    </footer>
  );
}
