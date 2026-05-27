// SPDX-License-Identifier: MIT

"use client";

import { useMemo, useState } from "react";
import { formatCostCents } from "../../lib/format-cost";
import { classifySeed, shortUrlLabel } from "../../lib/seed-input";
import type { useIcpRun } from "../../lib/use-icp-run";
import { ArchetypeResultsGrid } from "../product/ArchetypeResultsGrid";
import { RunDoneCallouts } from "../product/RunDoneCallouts";
import { RunErrorState } from "../product/RunErrorState";
import { RunProgress } from "../product/RunProgress";

const EXAMPLES = [
  "AI invoicing tool for indie SaaS founders",
  "linear.app",
  "DevTools for solo founders shipping their first app",
];

type IcpRun = ReturnType<typeof useIcpRun>;

interface HeroChatProps {
  run: IcpRun;
  /** Opens the BYOK dialog. Owned by parent (HeroSurface) so the dialog is mounted once. */
  onOpenByok: () => void;
}

export function HeroChat({ run, onOpenByok }: HeroChatProps) {
  const { state, archetypeList, byok, elapsedMs, submit, retry, canRetry, stop } = run;
  const [seed, setSeed] = useState("");
  const expectedTotal = 3;
  const doneCount =
    state.status === "done" ? archetypeList.length : Math.max(0, archetypeList.length - 1);

  const onSubmit = () => {
    if (!seed.trim() || state.status === "running") return;
    submit(seed);
  };

  const onExample = (s: string) => {
    if (state.status === "running") return;
    setSeed(s);
  };

  const hasActivity = state.status !== "idle";
  const classified = useMemo(() => classifySeed(seed), [seed]);
  const isUrl = classified.kind === "url";

  return (
    <div className="relative mx-auto w-full max-w-[860px] lg:mx-0 lg:max-w-none">
      {/* Chat input — the centerpiece. Borderless except for the focus glow. */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="relative"
      >
        <label htmlFor="hero-seed" className="sr-only">
          Describe your product or idea
        </label>
        <div
          className="group relative rounded-[24px] border border-[color:var(--hairline-2)] bg-[color:var(--bg-elev)] transition-shadow focus-within:border-[color:var(--mint-deep)]"
          style={{
            boxShadow:
              "0 1px 2px rgba(15,16,20,0.04), 0 24px 60px -24px var(--iris-glow), 0 8px 24px -16px var(--mint-glow)",
          }}
        >
          <textarea
            id="hero-seed"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            onKeyDown={(e) => {
              // Guard against IME composition: when CJK / accent IMEs commit
              // a character with Enter the keydown still fires — submitting
              // here would lose the in-flight composition.
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                onSubmit();
              }
            }}
            placeholder="Paste your product idea, or a website URL…"
            disabled={state.status === "running"}
            rows={3}
            aria-describedby="hero-seed-examples"
            className="w-full resize-none rounded-[24px] bg-transparent px-5 pt-5 pb-16 text-[17px] leading-[1.45] text-[color:var(--text)] outline-none placeholder:text-[color:var(--text-dim)] disabled:opacity-60 md:px-6 md:pt-6 md:pb-16 md:text-[18px]"
          />

          {/* URL badge — bottom-left, when input looks like a URL */}
          {isUrl ? (
            <div className="pointer-events-none absolute bottom-3 left-3 md:bottom-4 md:left-4">
              <span
                className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--mint-deep)] bg-[color:var(--bg-card-hi)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[color:var(--mint-deep)]"
                aria-label={`Will scan ${shortUrlLabel(seed)}`}
              >
                <span aria-hidden="true">↳</span>
                scan {shortUrlLabel(seed)}
              </span>
            </div>
          ) : null}

          {/* Action row — settings + submit/stop, bottom-right */}
          <div className="absolute right-3 bottom-3 flex items-center gap-2 md:right-4 md:bottom-4">
            <button
              type="button"
              onClick={onOpenByok}
              aria-label="Open API key settings"
              title={byok ? "Your API keys" : "Use your own API keys"}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--hairline-2)] bg-[color:var(--bg-card-hi)] text-[color:var(--text-muted)] transition-colors hover:bg-[color:var(--bg-elev)] hover:text-[color:var(--text)]"
            >
              {byok ? (
                // Filled "key" glyph when BYOK is active — subtle mint tint
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ color: "var(--mint-deep)" }}
                >
                  <circle cx="7.5" cy="15.5" r="3.5" />
                  <path d="m10 13 9-9 3 3-3 3-3-3-3 3" />
                </svg>
              ) : (
                // Outlined key glyph when running on operator keys
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="7.5" cy="15.5" r="3.5" />
                  <path d="m10 13 9-9 3 3-3 3-3-3-3 3" />
                </svg>
              )}
            </button>

            {state.status === "running" ? (
              <button
                type="button"
                onClick={stop}
                aria-label="Stop run"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--hairline-2)] bg-[color:var(--bg-card-hi)] text-[color:var(--text)] transition-colors hover:bg-[color:var(--bg-elev)]"
              >
                <span
                  aria-hidden="true"
                  className="block h-3 w-3 rounded-sm bg-[color:var(--coral)]"
                />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!seed.trim()}
                aria-label="Find ICPs"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full text-white transition-transform hover:-translate-y-px active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                style={{
                  background: "linear-gradient(135deg, var(--mint-deep), var(--iris-deep))",
                  boxShadow:
                    "0 0 0 1px rgba(255,255,255,0.5) inset, 0 8px 20px -6px var(--iris-glow)",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 19V5" />
                  <path d="m5 12 7-7 7 7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Example chips — under input, wrap on mobile */}
      {!hasActivity ? (
        <div
          id="hero-seed-examples"
          className="mt-4 flex flex-wrap items-center justify-center gap-2"
        >
          <span className="text-[12px] font-medium uppercase tracking-[0.12em] text-[color:var(--text-dim)]">
            try
          </span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => onExample(ex)}
              aria-label={`Use example: ${ex}`}
              className="rounded-full border border-[color:var(--hairline)] bg-[color:var(--bg-elev)] px-3 py-1.5 text-[12px] text-[color:var(--text-muted)] transition-colors hover:bg-[color:var(--bg-card-hi)] hover:text-[color:var(--text)]"
            >
              {ex.length > 38 ? `${ex.slice(0, 36)}…` : ex}
            </button>
          ))}
        </div>
      ) : null}

      {/* Inline run header — minimal */}
      {hasActivity ? (
        <div
          className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[12px] text-[color:var(--text-muted)] tabular"
          aria-live="polite"
        >
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{
                background: state.status === "error" ? "var(--error)" : "var(--mint-deep)",
                boxShadow: state.status === "error" ? "none" : "0 0 10px var(--mint-glow)",
                animation:
                  state.status === "running" ? "icp-pulse 1100ms ease-in-out infinite" : undefined,
              }}
            />
            {state.status}
          </span>
          <span aria-hidden="true">·</span>
          <span>{(elapsedMs / 1000).toFixed(1)}s</span>
          <span aria-hidden="true">·</span>
          <span>
            {archetypeList.length}/{expectedTotal} archetypes
          </span>
          <span aria-hidden="true">·</span>
          <span className="text-[color:var(--coral)] font-semibold">
            {formatCostCents(state.totalCostCents)}
          </span>
          <span aria-hidden="true">·</span>
          <span>{byok ? "byok" : "free demo"}</span>
        </div>
      ) : null}

      {/* Progress bar */}
      <div className="mt-3">
        <RunProgress done={doneCount} total={expectedTotal} status={state.status} />
      </div>

      {/* Errors */}
      {state.errors.length > 0 ? (
        <div className="mt-3">
          <RunErrorState
            errors={state.errors}
            byok={byok}
            onAddKeys={onOpenByok}
            onRetry={retry}
            canRetry={canRetry}
          />
        </div>
      ) : null}

      {/* Results — stream inline below the input */}
      {hasActivity && archetypeList.length > 0 ? (
        <div className="mt-6">
          <ArchetypeResultsGrid
            archetypeList={archetypeList}
            candidatesByArchetype={state.candidatesByArchetype}
            status={state.status}
          />
        </div>
      ) : null}

      {/* Done state — link to /find for sharing / full UI */}
      {state.status === "done" ? (
        <div className="mt-6">
          <RunDoneCallouts variant="hero" byok={byok} onAddKeys={onOpenByok} />
        </div>
      ) : null}
    </div>
  );
}
