// SPDX-License-Identifier: MIT

"use client";

import type { Archetype, Candidate, FindEvent } from "@icpfinder/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { Nav } from "../../components/marketing/Nav";
import { Footer } from "../../components/marketing/Footer";
import { ArchetypeCard } from "../../components/product/ArchetypeCard";
import { EmptyState } from "../../components/product/EmptyState";
import { RunHeader } from "../../components/product/RunHeader";
import { RunProgress } from "../../components/product/RunProgress";

type RunStatus = "idle" | "running" | "done" | "error";

interface RunState {
  status: RunStatus;
  archetypes: Map<string, Archetype>;
  candidatesByArchetype: Map<string, Candidate[]>;
  totalCostCents: number;
  errors: string[];
  startedAt: number | null;
  finishedAt: number | null;
  runId: string | null;
}

const initialState: RunState = {
  status: "idle",
  archetypes: new Map(),
  candidatesByArchetype: new Map(),
  totalCostCents: 0,
  errors: [],
  startedAt: null,
  finishedAt: null,
  runId: null,
};

const GEMINI_LS_KEY = "icpfinder:geminiApiKey";
const HUNTER_LS_KEY = "icpfinder:hunterApiKey";

const parseSseChunk = (raw: string): FindEvent[] => {
  const events: FindEvent[] = [];
  for (const block of raw.split("\n\n")) {
    if (!block.trim() || block.startsWith(":")) continue;
    const dataLine = block.split("\n").find((l) => l.startsWith("data: "));
    if (!dataLine) continue;
    try {
      events.push(JSON.parse(dataLine.slice(6)) as FindEvent);
    } catch {
      // skip malformed/heartbeat frames silently
    }
  }
  return events;
};

function shortRunId(): string {
  return Math.random().toString(36).slice(2, 12);
}

export default function FindPage() {
  const [seed, setSeed] = useState("");
  const [state, setState] = useState<RunState>(initialState);
  const [showKeys, setShowKeys] = useState(false);
  const [geminiKey, setGeminiKey] = useState("");
  const [hunterKey, setHunterKey] = useState("");
  const [now, setNow] = useState(Date.now());
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      const g = window.localStorage.getItem(GEMINI_LS_KEY) ?? "";
      const h = window.localStorage.getItem(HUNTER_LS_KEY) ?? "";
      setGeminiKey(g);
      setHunterKey(h);
      if (g || h) setShowKeys(true);
    } catch {
      // localStorage may be disabled
    }
  }, []);

  // Tick clock while running for elapsed display
  useEffect(() => {
    if (state.status !== "running") return;
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, [state.status]);

  const persistKeys = useCallback((gemini: string, hunter: string) => {
    try {
      if (gemini) window.localStorage.setItem(GEMINI_LS_KEY, gemini);
      else window.localStorage.removeItem(GEMINI_LS_KEY);
      if (hunter) window.localStorage.setItem(HUNTER_LS_KEY, hunter);
      else window.localStorage.removeItem(HUNTER_LS_KEY);
    } catch {
      // ignore
    }
  }, []);

  const applyEvent = useCallback((event: FindEvent) => {
    setState((prev) => {
      const next: RunState = {
        ...prev,
        archetypes: new Map(prev.archetypes),
        candidatesByArchetype: new Map(prev.candidatesByArchetype),
        errors: [...prev.errors],
      };
      if (event.type === "archetype") {
        next.archetypes.set(event.archetype.id, event.archetype);
        if (!next.candidatesByArchetype.has(event.archetype.id)) {
          next.candidatesByArchetype.set(event.archetype.id, []);
        }
      } else if (event.type === "candidate") {
        const list = next.candidatesByArchetype.get(event.candidate.archetypeId) ?? [];
        next.candidatesByArchetype.set(event.candidate.archetypeId, [...list, event.candidate]);
      } else if (event.type === "cost") {
        next.totalCostCents = prev.totalCostCents + event.cost.costCents;
      } else if (event.type === "error") {
        next.errors.push(event.message);
      } else if (event.type === "done") {
        next.status = "done";
        next.totalCostCents = event.totalCostCents || prev.totalCostCents;
        next.finishedAt = Date.now();
      }
      return next;
    });
  }, []);

  const submit = useCallback(async () => {
    if (!seed.trim()) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    persistKeys(geminiKey.trim(), hunterKey.trim());
    setState({
      ...initialState,
      status: "running",
      startedAt: Date.now(),
      runId: shortRunId(),
    });
    setNow(Date.now());

    const requestBody: Record<string, unknown> = { seed };
    if (geminiKey.trim() && hunterKey.trim()) {
      requestBody.geminiApiKey = geminiKey.trim();
      requestBody.hunterApiKey = hunterKey.trim();
    }

    try {
      const response = await fetch("/api/find", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        const message = await response.text().catch(() => `HTTP ${response.status}`);
        setState((prev) => ({
          ...prev,
          status: "error",
          errors: [...prev.errors, message],
          finishedAt: Date.now(),
        }));
        return;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lastBoundary = buffer.lastIndexOf("\n\n");
        if (lastBoundary === -1) continue;
        const chunk = buffer.slice(0, lastBoundary + 2);
        buffer = buffer.slice(lastBoundary + 2);
        for (const event of parseSseChunk(chunk)) applyEvent(event);
      }
      if (buffer.trim()) {
        for (const event of parseSseChunk(buffer)) applyEvent(event);
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setState((prev) => ({
        ...prev,
        status: "error",
        errors: [...prev.errors, err instanceof Error ? err.message : String(err)],
        finishedAt: Date.now(),
      }));
    }
  }, [seed, geminiKey, hunterKey, applyEvent, persistKeys]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setState((prev) => ({ ...prev, status: "done", finishedAt: Date.now() }));
  }, []);

  const archetypeList = Array.from(state.archetypes.values());
  const byok = Boolean(geminiKey.trim() && hunterKey.trim());
  const expectedTotal = 3;
  const doneCount =
    state.status === "done" ? archetypeList.length : Math.max(0, archetypeList.length - 1);
  const elapsedMs = state.startedAt
    ? (state.finishedAt ?? now) - state.startedAt
    : 0;

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-[color:var(--bg-elev)] focus:px-4 focus:py-2 focus:text-sm focus:text-[color:var(--text)] focus:shadow-md"
      >
        Skip to main content
      </a>
      <Nav />

      <main
        id="main"
        className="mx-auto grid max-w-[1240px] gap-6 px-6 pb-16 pt-8 md:px-12 md:pt-12 lg:px-[72px]"
      >
        <header>
          <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-[color:var(--text)] md:text-[36px]">
            <span
              style={{
                background:
                  "linear-gradient(110deg, var(--mint-deep) 0%, var(--iris-deep) 60%, var(--coral) 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              find
            </span>{" "}
            your ICP in 30 seconds
          </h1>
          <p className="mt-2 max-w-[560px] text-[15px] text-[color:var(--text-muted)]">
            Paste your product idea. Three buyer archetypes + verified emails stream in. Free demo:
            1 archetype + 3 contacts. Add your keys below for unlimited.
          </p>
        </header>

        <RunHeader
          status={state.status}
          archetypeCount={archetypeList.length}
          totalCostCents={state.totalCostCents}
          elapsedMs={elapsedMs}
          byok={byok}
          runId={state.runId ?? undefined}
        />

        <section
          className="grid gap-3 rounded-[20px] border border-[color:var(--hairline)] bg-[color:var(--bg-card)] p-4 md:p-5"
          style={{ boxShadow: "0 1px 2px rgba(15,16,20,0.04), 0 8px 24px -12px var(--iris-glow)" }}
        >
          <label htmlFor="seed-input" className="sr-only">
            Describe your product or idea
          </label>
          <textarea
            id="seed-input"
            value={seed}
            placeholder="Describe your product or idea — one sentence is fine."
            onChange={(e) => setSeed(e.target.value)}
            disabled={state.status === "running"}
            className="min-h-[112px] resize-y rounded-[14px] border border-[color:var(--hairline-2)] bg-[color:var(--bg-elev)] p-3.5 text-[16px] text-[color:var(--text)] outline-none placeholder:text-[color:var(--text-dim)] focus-visible:border-[color:var(--mint-deep)] focus-visible:shadow-[0_0_0_4px_var(--mint-glow)] disabled:opacity-60"
            aria-describedby="seed-hint"
          />

          <div className="flex flex-wrap items-center gap-3">
            {state.status === "running" ? (
              <button
                type="button"
                onClick={stop}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-[color:var(--hairline-2)] bg-[color:var(--bg-elev)] px-5 text-[14px] font-semibold text-[color:var(--text)] transition-colors hover:bg-[color:var(--bg-card-hi)]"
              >
                Stop
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={!seed.trim()}
                className="inline-flex h-11 items-center gap-2 rounded-full px-5 text-[14px] font-semibold text-white transition-transform hover:-translate-y-px active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                style={{
                  background: "linear-gradient(95deg, var(--mint-deep), var(--iris-deep))",
                  boxShadow:
                    "0 0 0 1px rgba(255,255,255,0.5) inset, 0 8px 20px -6px var(--iris-glow)",
                }}
              >
                Find my ICPs <span aria-hidden="true">→</span>
              </button>
            )}
            <span id="seed-hint" className="text-[13px] text-[color:var(--text-muted)]">
              {byok
                ? "Using your keys (free, unlimited)."
                : "Free demo: 1 archetype + 3 contacts. Add keys for unlimited."}
            </span>
            <button
              type="button"
              onClick={() => setShowKeys((v) => !v)}
              className="ml-auto text-[13px] font-medium text-[color:var(--mint-deep)] hover:underline"
            >
              {showKeys ? "Hide keys" : "Use my own API keys (free, unlimited)"}
            </button>
          </div>

          {showKeys ? (
            <div className="grid gap-2.5 rounded-[14px] border border-[color:var(--hairline)] bg-[color:var(--bg-card-hi)] p-3">
              <label className="grid gap-1 text-[13px]">
                <span className="text-[color:var(--text-muted)]">Gemini API key</span>
                <input
                  type="password"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="AIza…"
                  autoComplete="off"
                  className="rounded-[10px] border border-[color:var(--hairline-2)] bg-[color:var(--bg-elev)] px-3 py-2 text-[14px] text-[color:var(--text)] outline-none focus-visible:border-[color:var(--mint-deep)] focus-visible:shadow-[0_0_0_4px_var(--mint-glow)]"
                />
                <small className="text-[11px] text-[color:var(--text-muted)]">
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    Get a free key →
                  </a>
                </small>
              </label>
              <label className="grid gap-1 text-[13px]">
                <span className="text-[color:var(--text-muted)]">Hunter.io API key</span>
                <input
                  type="password"
                  value={hunterKey}
                  onChange={(e) => setHunterKey(e.target.value)}
                  placeholder="…"
                  autoComplete="off"
                  className="rounded-[10px] border border-[color:var(--hairline-2)] bg-[color:var(--bg-elev)] px-3 py-2 text-[14px] text-[color:var(--text)] outline-none focus-visible:border-[color:var(--mint-deep)] focus-visible:shadow-[0_0_0_4px_var(--mint-glow)]"
                />
                <small className="text-[11px] text-[color:var(--text-muted)]">
                  <a
                    href="https://hunter.io/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    Get a free key (25/mo) →
                  </a>
                </small>
              </label>
              <small className="text-[11px] leading-[1.45] text-[color:var(--text-dim)]">
                Keys stay in your browser (localStorage). Sent only with each request, never logged
                or persisted server-side.
              </small>
            </div>
          ) : null}
        </section>

        <RunProgress done={doneCount} total={expectedTotal} status={state.status} />

        {state.errors.length > 0 ? (
          <div
            role="alert"
            className="rounded-[14px] border px-4 py-3 text-[13px] text-[color:var(--error)]"
            style={{
              borderColor: "color-mix(in srgb, var(--error) 30%, transparent)",
              background: "color-mix(in srgb, var(--error) 8%, transparent)",
            }}
          >
            <ul className="grid gap-1">
              {state.errors.map((msg) => (
                <li key={msg}>{msg}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {state.status === "idle" ? (
          <EmptyState onExamplePick={(ex) => setSeed(ex)} />
        ) : (
          <section
            aria-label="Run results"
            aria-live="polite"
            className="grid gap-3 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
          >
            {archetypeList.map((a, idx) => {
              const candidates = state.candidatesByArchetype.get(a.id) ?? [];
              const isLast = idx === archetypeList.length - 1;
              const status: "streaming" | "done" | "failed" =
                state.status === "error" && isLast
                  ? "failed"
                  : state.status === "running" && isLast
                    ? "streaming"
                    : "done";
              return (
                <ArchetypeCard
                  key={a.id}
                  archetype={a}
                  candidates={candidates}
                  status={status}
                  index={idx}
                />
              );
            })}
          </section>
        )}
      </main>

      <Footer />
    </>
  );
}
