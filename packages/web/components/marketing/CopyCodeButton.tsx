// SPDX-License-Identifier: MIT

"use client";

import { useCallback, useEffect, useState } from "react";

interface CopyCodeButtonProps {
  code: string;
  ariaLabel: string;
}

export function CopyCodeButton({ code, ariaLabel }: CopyCodeButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 1400);
    return () => window.clearTimeout(id);
  }, [copied]);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      // clipboard unavailable; user can still select the text
    }
  }, [code]);

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={ariaLabel}
      className="inline-flex h-7 items-center gap-1 rounded-full border border-[color:var(--hairline-2)] bg-[color:var(--bg-elev)] px-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[color:var(--text-muted)] transition-colors hover:text-[color:var(--text)]"
    >
      <span aria-live="polite">{copied ? "copied" : "copy"}</span>
    </button>
  );
}
