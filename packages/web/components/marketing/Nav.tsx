// SPDX-License-Identifier: MIT

import { Wordmark } from "../brand/Wordmark";
import { ModeToggle } from "../brand/ModeToggle";

export function Nav() {
  return (
    <nav
      aria-label="Primary"
      className="sticky top-0 z-50 border-b border-[color:var(--hairline)] backdrop-blur-md backdrop-saturate-150"
      style={{ background: "color-mix(in srgb, var(--bg) 78%, transparent)" }}
    >
      <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-3 px-4 py-3 sm:gap-6 sm:px-5 sm:py-4 md:px-12 lg:px-[72px]">
        <Wordmark href="/" size={26} />

        <div className="hidden gap-7 md:flex">
          <a
            href="/roadmap"
            className="text-sm text-[color:var(--text-muted)] transition-colors hover:text-[color:var(--text)]"
          >
            roadmap
          </a>
          <a
            href="https://github.com/clickspider/icpfinder"
            className="text-sm text-[color:var(--text-muted)] transition-colors hover:text-[color:var(--text)]"
          >
            github
          </a>
        </div>

        <div className="flex items-center gap-3">
          <ModeToggle />
          <a
            href="/find"
            className="inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold text-white transition-transform hover:-translate-y-px active:scale-[0.97] sm:px-4 sm:gap-2"
            style={{
              background: "linear-gradient(95deg, var(--mint-deep), var(--iris-deep))",
              boxShadow: "0 0 0 1px rgba(255,255,255,0.5) inset, 0 8px 20px -6px var(--iris-glow)",
            }}
          >
            <span>Try free</span>
            <span aria-hidden="true" className="hidden sm:inline">
              →
            </span>
          </a>
        </div>
      </div>
    </nav>
  );
}
