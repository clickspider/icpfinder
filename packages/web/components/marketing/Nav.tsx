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
      <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-6 px-6 py-4 md:px-12 lg:px-[72px]">
        <Wordmark href="/" />

        <div className="hidden gap-7 md:flex">
          <a
            href="https://github.com/clickspider/icpfinder#readme"
            className="text-sm text-[color:var(--text-muted)] transition-colors hover:text-[color:var(--text)]"
          >
            docs
          </a>
          <a
            href="https://github.com/clickspider/icpfinder/tree/main/examples"
            className="text-sm text-[color:var(--text-muted)] transition-colors hover:text-[color:var(--text)]"
          >
            examples
          </a>
          <a
            href="https://github.com/clickspider/icpfinder#self-hosting"
            className="text-sm text-[color:var(--text-muted)] transition-colors hover:text-[color:var(--text)]"
          >
            self-host
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
            className="inline-flex h-9 items-center gap-2 rounded-full px-4 text-[13px] font-semibold text-white transition-transform hover:-translate-y-px active:scale-[0.97]"
            style={{
              background: "linear-gradient(95deg, var(--mint-deep), var(--iris-deep))",
              boxShadow: "0 0 0 1px rgba(255,255,255,0.5) inset, 0 8px 20px -6px var(--iris-glow)",
            }}
          >
            Try it free
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </nav>
  );
}
