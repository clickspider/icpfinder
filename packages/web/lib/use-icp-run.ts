// SPDX-License-Identifier: MIT
//
// Shared streaming run hook used by both the marketing hero (inline live demo)
// and the dedicated /find page. Owns SSE parsing, abort, BYOK key handling,
// elapsed clock, and the run state machine.

"use client";

import type { Archetype, Candidate, FindEvent } from "@icpfinder/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type RunStatus = "idle" | "running" | "done" | "error";

export interface RunState {
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

export function useIcpRun() {
  const [state, setState] = useState<RunState>(initialState);
  const [geminiKey, setGeminiKey] = useState("");
  const [hunterKey, setHunterKey] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const abortRef = useRef<AbortController | null>(null);

  // Hydrate BYOK keys from localStorage on mount
  useEffect(() => {
    try {
      const g = window.localStorage.getItem(GEMINI_LS_KEY) ?? "";
      const h = window.localStorage.getItem(HUNTER_LS_KEY) ?? "";
      setGeminiKey(g);
      setHunterKey(h);
    } catch {
      // localStorage may be disabled
    }
  }, []);

  // Elapsed clock tick while running
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

  const submit = useCallback(
    async (seed: string) => {
      const trimmed = seed.trim();
      if (!trimmed) return;
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

      const requestBody: Record<string, unknown> = { seed: trimmed };
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
    },
    [geminiKey, hunterKey, applyEvent, persistKeys],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setState((prev) => ({ ...prev, status: "done", finishedAt: Date.now() }));
  }, []);

  const archetypeList = useMemo(() => Array.from(state.archetypes.values()), [state.archetypes]);
  const byok = Boolean(geminiKey.trim() && hunterKey.trim());
  const elapsedMs = state.startedAt ? (state.finishedAt ?? now) - state.startedAt : 0;

  return {
    state,
    archetypeList,
    byok,
    elapsedMs,
    geminiKey,
    hunterKey,
    setGeminiKey,
    setHunterKey,
    submit,
    stop,
  };
}
