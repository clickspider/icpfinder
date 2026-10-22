// SPDX-License-Identifier: MIT

"use client";

import { useCallback, useEffect, useState } from "react";

type Mode = "light" | "dark" | "system";

const STORAGE_KEY = "icpfinder.mode";

function readStoredMode(): Mode {
  try {
    const m = window.localStorage.getItem(STORAGE_KEY);
    if (m === "light" || m === "dark") return m;
  } catch {
    // localStorage unavailable
  }
  return "system";
}

function applyMode(mode: Mode) {
  const html = document.documentElement;
  if (mode === "system") {
    html.removeAttribute("data-mode");
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      html.setAttribute("data-mode", "dark");
    }
    return;
  }
  html.setAttribute("data-mode", mode);
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // ignore
  }
}

export function ModeToggle() {
  const [mode, setMode] = useState<Mode>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMode(readStoredMode());
    setMounted(true);
  }, []);

  const cycle = useCallback(() => {
    const next: Mode = mode === "light" ? "dark" : mode === "dark" ? "system" : "light";
    setMode(next);
    applyMode(next);
  }, [mode]);

  const label =
    mode === "light"
      ? "Switch to dark mode"
      : mode === "dark"
        ? "Use system mode"
        : "Switch to light mode";
  const icon =
    !mounted || mode === "system"
      ? "M3 3h18v14H3zM8 21h8M12 17v4"
      : mode === "dark"
        ? "M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11"
        : "M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1 1M18 18l1 1M5 19l1-1M18 6l1-1M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0";

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={label}
      title={label}
      suppressHydrationWarning
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--hairline-2)] bg-[color:var(--bg-elev)] text-[color:var(--text-muted)] transition-colors hover:text-[color:var(--text)] hover:bg-[color:var(--bg-card-hi)]"
    >
      <svg
        aria-hidden="true"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={icon} />
      </svg>
    </button>
  );
}
