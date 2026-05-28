// SPDX-License-Identifier: MIT

"use client";

import { useEffect, useRef } from "react";

interface ByokPanelProps {
  geminiKey: string;
  hunterKey: string;
  onGeminiChange: (v: string) => void;
  onHunterChange: (v: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rememberKeys: boolean;
  onRememberChange: (next: boolean) => void;
  onClearKeys: () => void;
}

/**
 * Bring-your-own-key dialog. Uses native `<dialog>` (zero JS deps, baked-in
 * a11y, ESC-to-close, backdrop click, focus trap). Mounted once on the page;
 * driven by controlled `open` prop. Deep-link target: `id="keys"` lives on
 * the dialog so `/find#keys` scrollIntoView still works.
 *
 * Security posture: keys live in memory by default. Persistence to
 * localStorage is opt-in via the "Remember on this device" checkbox, with
 * an explicit warning about what that exposes (any browser extension with
 * "Read site data" permission on this origin).
 */
export function ByokPanel({
  geminiKey,
  hunterKey,
  onGeminiChange,
  onHunterChange,
  open,
  onOpenChange,
  rememberKeys,
  onRememberChange,
  onClearKeys,
}: ByokPanelProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const geminiInputRef = useRef<HTMLInputElement>(null);

  // Sync controlled `open` → dialog imperative API.
  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (open && !dlg.open) {
      dlg.showModal();
      const id = window.setTimeout(() => geminiInputRef.current?.focus(), 16);
      return () => window.clearTimeout(id);
    }
    if (!open && dlg.open) dlg.close();
  }, [open]);

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    const onClose = () => onOpenChange(false);
    dlg.addEventListener("close", onClose);
    return () => dlg.removeEventListener("close", onClose);
  }, [onOpenChange]);

  const onBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) dialogRef.current?.close();
  };

  const hasAnyKey = Boolean(geminiKey || hunterKey);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: onClick only detects backdrop clicks; ESC + close button handle keyboard close via native <dialog>.
    <dialog
      ref={dialogRef}
      id="keys"
      onClick={onBackdropClick}
      className="m-0 max-h-[90vh] w-[min(460px,calc(100vw-32px))] rounded-[20px] border border-[color:var(--hairline-2)] bg-[color:var(--bg-card)] p-0 text-[color:var(--text)] backdrop:bg-[color:rgba(15,16,20,0.35)] backdrop:backdrop-blur-sm open:m-auto"
      style={{
        boxShadow:
          "0 1px 2px rgba(15,16,20,0.04), 0 24px 60px -16px rgba(15,16,20,0.32), 0 0 0 1px var(--hairline)",
      }}
      aria-labelledby="byok-title"
    >
      <div className="grid gap-3.5 p-5 md:p-6">
        <header className="flex items-start justify-between gap-3">
          <div className="grid gap-1">
            <h2
              id="byok-title"
              className="text-[18px] font-semibold tracking-[-0.01em] text-[color:var(--text)]"
            >
              Use your own keys
            </h2>
            <p className="text-[13px] leading-[1.5] text-[color:var(--text-muted)]">
              Free, unlimited runs on your Google + Hunter quota. Setup takes 30 seconds.
            </p>
          </div>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[color:var(--text-muted)] transition-colors hover:bg-[color:var(--bg-card-hi)] hover:text-[color:var(--text)]"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <div className="grid gap-3">
          <label className="grid gap-1 text-[13px]">
            <span className="font-medium text-[color:var(--text)]">Gemini API key</span>
            <input
              ref={geminiInputRef}
              type="password"
              value={geminiKey}
              onChange={(e) => onGeminiChange(e.target.value)}
              placeholder="AIza…"
              autoComplete="off"
              className="rounded-[10px] border border-[color:var(--hairline-2)] bg-[color:var(--bg-elev)] px-3 py-2.5 text-[14px] text-[color:var(--text)] outline-none focus-visible:border-[color:var(--mint-deep)] focus-visible:shadow-[0_0_0_4px_var(--mint-glow)]"
            />
            <small className="text-[11px] text-[color:var(--text-muted)]">
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                Get a free Gemini key →
              </a>
            </small>
          </label>
          <label className="grid gap-1 text-[13px]">
            <span className="font-medium text-[color:var(--text)]">Hunter.io API key</span>
            <input
              type="password"
              value={hunterKey}
              onChange={(e) => onHunterChange(e.target.value)}
              placeholder="…"
              autoComplete="off"
              className="rounded-[10px] border border-[color:var(--hairline-2)] bg-[color:var(--bg-elev)] px-3 py-2.5 text-[14px] text-[color:var(--text)] outline-none focus-visible:border-[color:var(--mint-deep)] focus-visible:shadow-[0_0_0_4px_var(--mint-glow)]"
            />
            <small className="text-[11px] text-[color:var(--text-muted)]">
              <a
                href="https://hunter.io/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                Get a free Hunter key (25/mo) →
              </a>
            </small>
          </label>
        </div>

        <label className="flex items-start gap-2.5 rounded-[12px] border border-[color:var(--hairline)] bg-[color:var(--bg-card-hi)] px-3 py-2.5 text-[13px] leading-[1.5]">
          <input
            type="checkbox"
            checked={rememberKeys}
            onChange={(e) => onRememberChange(e.target.checked)}
            className="mt-[3px] h-4 w-4 shrink-0 accent-[color:var(--mint-deep)]"
          />
          <span className="grid gap-0.5">
            <span className="font-medium text-[color:var(--text)]">Remember on this device</span>
            <span className="text-[12px] text-[color:var(--text-muted)]">
              Saves to your browser's localStorage so you don't re-paste next visit. Off by default
              — see the security note below.
            </span>
          </span>
        </label>

        <div
          className="flex items-start gap-2 rounded-[12px] border px-3 py-2.5 text-[12px] leading-[1.5] text-[color:var(--text-muted)]"
          style={{
            borderColor: "color-mix(in srgb, var(--mint-deep) 22%, transparent)",
            background: "color-mix(in srgb, var(--mint-deep) 6%, transparent)",
          }}
        >
          <svg
            aria-hidden="true"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mt-[2px] shrink-0"
            style={{ color: "var(--mint-deep)" }}
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span>
            <span className="font-medium text-[color:var(--text)]">How keys are handled.</span> Held
            in memory only by default. Sent once per request straight to Google + Hunter, never
            logged or persisted on our servers. If you tick <em>Remember</em>, keys are written to
            your browser's localStorage — any browser extension you've granted{" "}
            <em>"Read site data"</em> on this origin can read them. Read{" "}
            <a
              href="https://github.com/clickspider/icpfinder"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-[color:var(--text)]"
            >
              the MIT source
            </a>{" "}
            to verify.
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={onClearKeys}
            disabled={!hasAnyKey}
            className="inline-flex h-9 items-center rounded-full px-3 text-[13px] font-medium text-[color:var(--text-muted)] transition-colors hover:bg-[color:var(--bg-card-hi)] hover:text-[color:var(--text)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-[color:var(--text-muted)]"
          >
            Clear keys
          </button>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="inline-flex h-9 items-center rounded-full border border-[color:var(--hairline-2)] bg-[color:var(--bg-elev)] px-3.5 text-[13px] font-medium text-[color:var(--text-muted)] transition-colors hover:bg-[color:var(--bg-card-hi)] hover:text-[color:var(--text)]"
          >
            Done
          </button>
        </div>
      </div>
    </dialog>
  );
}
