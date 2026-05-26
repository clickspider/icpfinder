// SPDX-License-Identifier: MIT

import { Logo } from "./Logo";

interface WordmarkProps {
  size?: number;
  href?: string;
  className?: string;
}

export function Wordmark({ size = 28, href, className }: WordmarkProps) {
  const content = (
    <>
      <Logo size={size} />
      <span className="font-semibold tracking-[-0.015em]" style={{ fontSize: `${size * 0.58}px` }}>
        icpfinder
      </span>
    </>
  );
  if (href) {
    return (
      <a
        href={href}
        className={`inline-flex items-center gap-3 text-[color:var(--text)] no-underline ${className ?? ""}`}
        aria-label="icpfinder home"
      >
        {content}
      </a>
    );
  }
  return (
    <span className={`inline-flex items-center gap-3 text-[color:var(--text)] ${className ?? ""}`}>
      {content}
    </span>
  );
}
