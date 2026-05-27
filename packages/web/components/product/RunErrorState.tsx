// SPDX-License-Identifier: MIT

"use client";

import type { RunError } from "../../lib/use-icp-run";

interface RunErrorStateProps {
  errors: RunError[];
  byok: boolean;
  onAddKeys: () => void;
  onRetry: () => void;
  canRetry: boolean;
  /** When provided, BYOK button is suppressed (caller is already on a BYOK surface). */
  hideAddKeys?: boolean;
}

interface ErrorCopy {
  title: string;
  body: string;
  showAddKeys: boolean;
  /** Render the green security reassurance line under the body. */
  showSecurityNote: boolean;
}

function buildCopy(err: RunError | undefined, byok: boolean): ErrorCopy {
  const fallback: ErrorCopy = {
    title: "Something went wrong",
    body: err?.message ?? "Unknown error.",
    showAddKeys: !byok,
    showSecurityNote: !byok,
  };
  if (!err) return fallback;

  switch (err.code) {
    case "rate_limit":
    case "quota":
      return byok
        ? {
            title: "Your Gemini key needs a breather",
            body: "Google's free tier resets daily (~midnight Pacific). Wait it out, or paste a different key in the panel above.",
            showAddKeys: false,
            showSecurityNote: false,
          }
        : {
            title: "We're very full from previous requests",
            body: "Our shared free-tier Gemini key is rate-limited right now. Add your own free key to keep going — it takes 30 seconds at aistudio.google.com.",
            showAddKeys: true,
            showSecurityNote: true,
          };
    case "auth":
      return {
        title: "API key was rejected",
        body: byok
          ? "Double-check your Gemini key, then try again. Free keys at aistudio.google.com."
          : "Our operator key looks invalid. Add your own free Gemini key to keep going.",
        showAddKeys: !byok,
        showSecurityNote: !byok,
      };
    case "network":
      return {
        title: "Network hiccup",
        body: "Couldn't reach the server. Check your connection and try again.",
        showAddKeys: false,
        showSecurityNote: false,
      };
    default:
      return fallback;
  }
}

export function RunErrorState({
  errors,
  byok,
  onAddKeys,
  onRetry,
  canRetry,
  hideAddKeys,
}: RunErrorStateProps) {
  if (errors.length === 0) return null;
  // Use the most recent non-recoverable / typed error if present, else the last one.
  const primary =
    [...errors].reverse().find((e) => e.code && e.code !== "unknown") ?? errors[errors.length - 1];
  const copy = buildCopy(primary, byok);
  const showAddKeys = !hideAddKeys && copy.showAddKeys;
  const showSecurity = !hideAddKeys && copy.showSecurityNote;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="rounded-[14px] border px-4 py-3.5"
      style={{
        borderColor: "color-mix(in srgb, var(--error) 30%, transparent)",
        background: "color-mix(in srgb, var(--error) 8%, transparent)",
      }}
    >
      <div className="flex items-start gap-2.5">
        <span
          aria-hidden="true"
          className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ background: "var(--error)" }}
        />
        <div className="grid gap-1">
          <p className="text-[14px] font-semibold text-[color:var(--text)]">{copy.title}</p>
          <p className="text-[13px] leading-[1.5] text-[color:var(--text-muted)]">{copy.body}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {showAddKeys ? (
          <button
            type="button"
            onClick={onAddKeys}
            className="inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold text-white transition-transform hover:-translate-y-px active:scale-[0.97]"
            style={{
              background: "linear-gradient(95deg, var(--mint-deep), var(--iris-deep))",
              boxShadow: "0 0 0 1px rgba(255,255,255,0.5) inset, 0 8px 20px -6px var(--iris-glow)",
            }}
          >
            <span>Add your keys for unlimited</span>
            <span aria-hidden="true">↓</span>
          </button>
        ) : null}
        <button
          type="button"
          onClick={onRetry}
          disabled={!canRetry}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[color:var(--hairline-2)] bg-[color:var(--bg-elev)] px-3.5 text-[13px] font-medium text-[color:var(--text-muted)] transition-colors hover:bg-[color:var(--bg-card-hi)] hover:text-[color:var(--text)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[color:var(--bg-elev)] disabled:hover:text-[color:var(--text-muted)]"
        >
          Try again
        </button>
      </div>

      {showSecurity ? (
        <div className="mt-2.5 flex items-start gap-1.5 text-[12px] leading-[1.5] text-[color:var(--text-muted)]">
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
            <span className="font-medium text-[color:var(--text)]">Your keys stay private.</span>{" "}
            Stored in your browser's localStorage, sent once per request straight to Google + Hunter,
            never logged or persisted on our servers.
          </span>
        </div>
      ) : null}

      {errors.length > 1 ? (
        <details className="mt-2">
          <summary className="cursor-pointer text-[11px] text-[color:var(--text-dim)] hover:text-[color:var(--text-muted)]">
            {errors.length - 1} other warning{errors.length - 1 === 1 ? "" : "s"}
          </summary>
          <ul className="mt-1.5 grid gap-1 text-[12px] text-[color:var(--text-muted)]">
            {errors
              .filter((e) => e !== primary)
              .map((e) => (
                <li key={`${e.code ?? "unknown"}:${e.provider ?? ""}:${e.message}`}>
                  {e.message}
                </li>
              ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
