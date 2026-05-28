// SPDX-License-Identifier: MIT

"use client";

import { useMemo } from "react";
import { canonicalDiffersFromRaw, shortUrlLabel } from "../../lib/seed-input";

interface ScanBadgeProps {
  /** Raw seed as the user typed it. The badge handles trim + IDN canonicalize. */
  raw: string;
  /** Outer wrapper class — lets the caller pin position (absolute vs flow). */
  className?: string;
}

/**
 * Mint-outlined pill that announces the canonical scan target. Renders a
 * second "you typed: …" line when the URL constructor's punycode form
 * differs from the raw input, so the user can recognize their own paste
 * post-IDN normalization. Used in the hero chat and on /find.
 */
export function ScanBadge({ raw, className }: ScanBadgeProps) {
  const label = useMemo(() => shortUrlLabel(raw), [raw]);
  const idnDiffers = useMemo(() => canonicalDiffersFromRaw(raw), [raw]);
  return (
    <span
      className={`inline-flex flex-col items-start gap-0 rounded-[12px] border border-[color:var(--mint-deep)] bg-[color:var(--bg-card-hi)] px-2.5 py-1 ${className ?? ""}`}
      aria-label={`Will scan ${label}`}
    >
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[color:var(--mint-deep)]">
        <span aria-hidden="true">↳</span>
        scan {label}
      </span>
      {idnDiffers ? (
        <span className="text-[10px] normal-case tracking-normal text-[color:var(--text-muted)]">
          you typed: {raw.trim()}
        </span>
      ) : null}
    </span>
  );
}
