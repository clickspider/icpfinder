// SPDX-License-Identifier: MIT

"use client";

import { useCallback, useEffect, useState } from "react";

const CMD = "npm i @icpfinder/core @icpfinder/providers";

export function NpmInstallLine() {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 1400);
    return () => window.clearTimeout(id);
  }, [copied]);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(CMD);
      setCopied(true);
    } catch {
      // clipboard unavailable; user can still select the text
    }
  }, []);

  return (
    <div
      className="mt-7 inline-flex max-w-full items-center gap-3 rounded-[14px] border border-[color:var(--hairline-2)] bg-[color:var(--bg-elev)] py-2.5 pl-4 pr-2"
      style={{ boxShadow: "0 4px 16px -8px var(--mint-glow)" }}
    >
      <span aria-hidden="true" className="font-mono text-[14px] font-bold text-[color:var(--mint-deep)]">
        $
      </span>
      <code className="font-mono text-[14px] text-[color:var(--text)] whitespace-nowrap overflow-x-auto">
        {CMD}
      </code>
      <button
        type="button"
        onClick={onCopy}
        aria-label="Copy npm install command"
        className="ml-1 inline-flex h-8 items-center gap-1.5 rounded-full border border-[color:var(--hairline-2)] bg-[color:var(--bg-card-hi)] px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--text-muted)] transition-colors hover:text-[color:var(--text)]"
      >
        <span aria-live="polite">{copied ? "copied" : "copy"}</span>
      </button>
    </div>
  );
}
