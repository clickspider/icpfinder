// SPDX-License-Identifier: MIT
//
// Shared streaming run hook used by both the marketing hero (inline live
// demo) and the dedicated /find page. Drives the two-phase flow:
//
//   submit(seed)
//     → /api/archetypes (stream archetype events)
//     → state.status flips to "done" once archetypes finish streaming.
//
//   enrichArchetype(archetypeId)
//     → /api/candidates?archetypeId=X
//     → stream candidates for that archetype only. Other archetypes stay
//       in "awaiting-pick".
//
//   deepenCandidate(candidate)  → POST /api/deepen, populates dossier map.
//   moreContacts(archetypeId)   → POST /api/more-contacts, appends candidates.
//   copyOutreach(candidate)     → POST /api/outreach, returns the draft.
//
// Plus BYOK key handling, abort, elapsed clock, error attribution, and the
// run state machine.

"use client";

import type {
  Archetype,
  Candidate,
  DeepenResult,
  FindErrorCode,
  FindErrorProvider,
  FindEvent,
} from "@icpfinder/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type RunStatus = "idle" | "running" | "done" | "error";
export type ArchetypeStatus =
  | "awaiting-pick"
  | "enriching"
  | "enriched"
  | "enriching-more"
  | "error";

export interface RunError {
  message: string;
  code?: FindErrorCode;
  provider?: FindErrorProvider;
}

export interface RunState {
  status: RunStatus;
  archetypes: Map<string, Archetype>;
  archetypeStatus: Map<string, ArchetypeStatus>;
  candidatesByArchetype: Map<string, Candidate[]>;
  deepenByCandidate: Map<string, DeepenResult>;
  deepenInFlight: Set<string>;
  outreachByCandidate: Map<string, string>;
  totalCostCents: number;
  errors: RunError[];
  startedAt: number | null;
  finishedAt: number | null;
  runId: string | null;
}

const initialState: RunState = {
  status: "idle",
  archetypes: new Map(),
  archetypeStatus: new Map(),
  candidatesByArchetype: new Map(),
  deepenByCandidate: new Map(),
  deepenInFlight: new Set(),
  outreachByCandidate: new Map(),
  totalCostCents: 0,
  errors: [],
  startedAt: null,
  finishedAt: null,
  runId: null,
};

const GEMINI_LS_KEY = "icpfinder:geminiApiKey";
const HUNTER_LS_KEY = "icpfinder:hunterApiKey";
const REMEMBER_LS_KEY = "icpfinder:rememberKeys";

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

interface ApiError {
  error?: string;
  code?: FindErrorCode;
  provider?: FindErrorProvider;
}

export function useIcpRun() {
  const [state, setState] = useState<RunState>(initialState);
  const [geminiKey, setGeminiKey] = useState("");
  const [hunterKey, setHunterKey] = useState("");
  // Memory-only by default. Persistence is opt-in to limit the blast radius
  // of a malicious browser extension reading localStorage.
  const [rememberKeys, setRememberKeysState] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const abortRef = useRef<AbortController | null>(null);
  const enrichAbortRefs = useRef<Map<string, AbortController>>(new Map());
  const lastSeedRef = useRef<string>("");

  useEffect(() => {
    try {
      const remember = window.localStorage.getItem(REMEMBER_LS_KEY) === "1";
      if (remember) {
        setRememberKeysState(true);
        setGeminiKey(window.localStorage.getItem(GEMINI_LS_KEY) ?? "");
        setHunterKey(window.localStorage.getItem(HUNTER_LS_KEY) ?? "");
      } else {
        window.localStorage.removeItem(GEMINI_LS_KEY);
        window.localStorage.removeItem(HUNTER_LS_KEY);
      }
    } catch {
      // localStorage disabled
    }
  }, []);

  useEffect(() => {
    if (state.status !== "running") return;
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, [state.status]);

  const persistKeys = useCallback((gemini: string, hunter: string, remember: boolean) => {
    try {
      if (remember) {
        window.localStorage.setItem(REMEMBER_LS_KEY, "1");
        if (gemini) window.localStorage.setItem(GEMINI_LS_KEY, gemini);
        else window.localStorage.removeItem(GEMINI_LS_KEY);
        if (hunter) window.localStorage.setItem(HUNTER_LS_KEY, hunter);
        else window.localStorage.removeItem(HUNTER_LS_KEY);
      } else {
        window.localStorage.removeItem(REMEMBER_LS_KEY);
        window.localStorage.removeItem(GEMINI_LS_KEY);
        window.localStorage.removeItem(HUNTER_LS_KEY);
      }
    } catch {
      // ignore
    }
  }, []);

  const setRememberKeys = useCallback(
    (next: boolean) => {
      setRememberKeysState(next);
      persistKeys(geminiKey.trim(), hunterKey.trim(), next);
    },
    [geminiKey, hunterKey, persistKeys]
  );

  const clearKeys = useCallback(() => {
    setGeminiKey("");
    setHunterKey("");
    setRememberKeysState(false);
    try {
      window.localStorage.removeItem(REMEMBER_LS_KEY);
      window.localStorage.removeItem(GEMINI_LS_KEY);
      window.localStorage.removeItem(HUNTER_LS_KEY);
    } catch {
      // ignore
    }
  }, []);

  const requestBody = useCallback(
    (extra: Record<string, unknown>): Record<string, unknown> => {
      const out: Record<string, unknown> = { ...extra };
      if (geminiKey.trim()) out.geminiApiKey = geminiKey.trim();
      if (hunterKey.trim()) out.hunterApiKey = hunterKey.trim();
      return out;
    },
    [geminiKey, hunterKey]
  );

  const applyArchetypeEvent = useCallback((event: FindEvent) => {
    setState((prev) => {
      const next: RunState = {
        ...prev,
        archetypes: new Map(prev.archetypes),
        archetypeStatus: new Map(prev.archetypeStatus),
        candidatesByArchetype: new Map(prev.candidatesByArchetype),
        errors: [...prev.errors],
      };
      if (event.type === "archetype") {
        next.archetypes.set(event.archetype.id, event.archetype);
        if (!next.archetypeStatus.has(event.archetype.id)) {
          next.archetypeStatus.set(event.archetype.id, "awaiting-pick");
        }
        if (!next.candidatesByArchetype.has(event.archetype.id)) {
          next.candidatesByArchetype.set(event.archetype.id, []);
        }
      } else if (event.type === "cost") {
        next.totalCostCents = prev.totalCostCents + event.cost.costCents;
      } else if (event.type === "error") {
        next.errors.push({
          message: event.message,
          code: event.code,
          provider: event.provider,
        });
      } else if (event.type === "done") {
        next.status = "done";
        next.totalCostCents = event.totalCostCents || prev.totalCostCents;
        next.finishedAt = Date.now();
      }
      return next;
    });
  }, []);

  const applyEnrichEvent = useCallback((archetypeId: string, event: FindEvent) => {
    setState((prev) => {
      const next: RunState = {
        ...prev,
        candidatesByArchetype: new Map(prev.candidatesByArchetype),
        archetypeStatus: new Map(prev.archetypeStatus),
        errors: [...prev.errors],
      };
      if (event.type === "candidate") {
        const list = next.candidatesByArchetype.get(event.candidate.archetypeId) ?? [];
        next.candidatesByArchetype.set(event.candidate.archetypeId, [
          ...list,
          event.candidate,
        ]);
      } else if (event.type === "cost") {
        next.totalCostCents = prev.totalCostCents + event.cost.costCents;
      } else if (event.type === "error") {
        next.errors.push({
          message: event.message,
          code: event.code,
          provider: event.provider,
        });
        if (!event.recoverable) next.archetypeStatus.set(archetypeId, "error");
      } else if (event.type === "done") {
        const current = next.archetypeStatus.get(archetypeId);
        if (current !== "error") {
          next.archetypeStatus.set(archetypeId, "enriched");
        }
      }
      return next;
    });
  }, []);

  async function streamSse(
    url: string,
    body: Record<string, unknown>,
    signal: AbortSignal,
    onEvent: (event: FindEvent) => void,
  ): Promise<void> {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
    if (!response.ok || !response.body) {
      const raw = await response.text().catch(() => "");
      let parsed: ApiError | null = null;
      if (raw) {
        try {
          parsed = JSON.parse(raw) as ApiError;
        } catch {
          // not JSON
        }
      }
      const code: FindErrorCode =
        parsed?.code ??
        (response.status === 410
          ? "unknown"
          : response.status === 429
            ? "rate_limit"
            : response.status === 402
              ? "quota"
              : "unknown");
      throw Object.assign(
        new Error(parsed?.error ?? raw ?? `HTTP ${response.status}`),
        { code, provider: parsed?.provider },
      );
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
      for (const event of parseSseChunk(chunk)) onEvent(event);
    }
    if (buffer.trim()) {
      for (const event of parseSseChunk(buffer)) onEvent(event);
    }
  }

  const submit = useCallback(
    async (seed: string) => {
      const trimmed = seed.trim();
      if (!trimmed) return;
      abortRef.current?.abort();
      for (const c of enrichAbortRefs.current.values()) c.abort();
      enrichAbortRefs.current.clear();
      const controller = new AbortController();
      abortRef.current = controller;
      lastSeedRef.current = trimmed;
      persistKeys(geminiKey.trim(), hunterKey.trim(), rememberKeys);
      setState({
        ...initialState,
        archetypes: new Map(),
        archetypeStatus: new Map(),
        candidatesByArchetype: new Map(),
        deepenByCandidate: new Map(),
        deepenInFlight: new Set(),
        outreachByCandidate: new Map(),
        errors: [],
        status: "running",
        startedAt: Date.now(),
        runId: shortRunId(),
      });
      setNow(Date.now());

      try {
        await streamSse(
          "/api/archetypes",
          requestBody({ seed: trimmed }),
          controller.signal,
          applyArchetypeEvent,
        );
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        const e = err as Error & { code?: FindErrorCode; provider?: FindErrorProvider };
        setState((prev) => ({
          ...prev,
          status: "error",
          errors: [
            ...prev.errors,
            { message: e.message, code: e.code ?? "network", provider: e.provider },
          ],
          finishedAt: Date.now(),
        }));
      }
    },
    [geminiKey, hunterKey, rememberKeys, applyArchetypeEvent, persistKeys, requestBody]
  );

  const enrichArchetype = useCallback(
    async (archetypeId: string) => {
      const seed = lastSeedRef.current;
      if (!seed) return;
      enrichAbortRefs.current.get(archetypeId)?.abort();
      const controller = new AbortController();
      enrichAbortRefs.current.set(archetypeId, controller);
      setState((prev) => {
        const next = new Map(prev.archetypeStatus);
        next.set(archetypeId, "enriching");
        return { ...prev, archetypeStatus: next };
      });
      try {
        await streamSse(
          "/api/candidates",
          requestBody({ seed, archetypeId }),
          controller.signal,
          (e) => applyEnrichEvent(archetypeId, e),
        );
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        const e = err as Error & { code?: FindErrorCode; provider?: FindErrorProvider };
        setState((prev) => {
          const archetypeStatus = new Map(prev.archetypeStatus);
          archetypeStatus.set(archetypeId, "error");
          return {
            ...prev,
            archetypeStatus,
            errors: [
              ...prev.errors,
              { message: e.message, code: e.code ?? "network", provider: e.provider },
            ],
          };
        });
      }
    },
    [applyEnrichEvent, requestBody]
  );

  const moreContacts = useCallback(
    async (archetypeId: string) => {
      const seed = lastSeedRef.current;
      if (!seed) return;
      const controller = new AbortController();
      const current = state.candidatesByArchetype.get(archetypeId) ?? [];
      const offset = current.length;
      setState((prev) => {
        const next = new Map(prev.archetypeStatus);
        next.set(archetypeId, "enriching-more");
        return { ...prev, archetypeStatus: next };
      });
      try {
        await streamSse(
          "/api/more-contacts",
          requestBody({ seed, archetypeId, offset }),
          controller.signal,
          (e) => applyEnrichEvent(archetypeId, e),
        );
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        const e = err as Error & { code?: FindErrorCode; provider?: FindErrorProvider };
        setState((prev) => ({
          ...prev,
          errors: [
            ...prev.errors,
            { message: e.message, code: e.code ?? "network", provider: e.provider },
          ],
        }));
      }
    },
    [applyEnrichEvent, requestBody, state.candidatesByArchetype]
  );

  const deepenCandidate = useCallback(
    async (candidate: Candidate): Promise<DeepenResult | null> => {
      const seed = lastSeedRef.current;
      if (!seed) return null;
      setState((prev) => {
        const inFlight = new Set(prev.deepenInFlight);
        inFlight.add(candidate.id);
        return { ...prev, deepenInFlight: inFlight };
      });
      try {
        const res = await fetch("/api/deepen", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(
            requestBody({
              seed,
              candidateId: candidate.id,
              companyName: candidate.companyName,
              domain: candidate.domain,
              contactFirstName: candidate.contactFirstName,
              contactLastName: candidate.contactLastName,
              contactRole: candidate.contactRole,
            })
          ),
        });
        if (!res.ok) {
          const raw = await res.text().catch(() => "");
          let parsed: ApiError | null = null;
          try {
            parsed = JSON.parse(raw) as ApiError;
          } catch {
            // not JSON
          }
          setState((prev) => ({
            ...prev,
            errors: [
              ...prev.errors,
              {
                message: parsed?.error ?? raw ?? `Deepen failed: ${res.status}`,
                code: parsed?.code,
                provider: parsed?.provider,
              },
            ],
          }));
          return null;
        }
        const data = (await res.json()) as DeepenResult;
        setState((prev) => {
          const next = new Map(prev.deepenByCandidate);
          next.set(candidate.id, data);
          return { ...prev, deepenByCandidate: next };
        });
        return data;
      } finally {
        setState((prev) => {
          const inFlight = new Set(prev.deepenInFlight);
          inFlight.delete(candidate.id);
          return { ...prev, deepenInFlight: inFlight };
        });
      }
    },
    [requestBody]
  );

  const copyOutreach = useCallback(
    async (candidate: Candidate, archetype: Archetype): Promise<string | null> => {
      const seed = lastSeedRef.current;
      if (!seed) return null;
      const res = await fetch("/api/outreach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          requestBody({
            seed,
            candidateId: candidate.id,
            firstName: candidate.contactFirstName,
            companyName: candidate.companyName,
            archetypeRole: archetype.role,
            sellingAngle: archetype.sellingAngle,
            whyNow: candidate.whyNow,
          })
        ),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { draft?: string };
      const draft = data.draft ?? null;
      if (draft) {
        setState((prev) => {
          const next = new Map(prev.outreachByCandidate);
          next.set(candidate.id, draft);
          return { ...prev, outreachByCandidate: next };
        });
        try {
          await navigator.clipboard.writeText(draft);
        } catch {
          // user-gesture/permission denied — caller can still read state.
        }
      }
      return draft;
    },
    [requestBody]
  );

  const retry = useCallback(() => {
    const seed = lastSeedRef.current;
    if (!seed) return;
    void submit(seed);
  }, [submit]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    for (const c of enrichAbortRefs.current.values()) c.abort();
    setState((prev) => ({ ...prev, status: "done", finishedAt: Date.now() }));
  }, []);

  const archetypeList = useMemo(
    () => Array.from(state.archetypes.values()),
    [state.archetypes]
  );
  // "byok" for UI = at least one user-supplied key (lights the key icon).
  const byok = Boolean(geminiKey.trim() || hunterKey.trim());
  const elapsedMs = state.startedAt ? (state.finishedAt ?? now) - state.startedAt : 0;
  const canRetry = Boolean(lastSeedRef.current) && state.status !== "running";

  return {
    state,
    archetypeList,
    byok,
    elapsedMs,
    geminiKey,
    hunterKey,
    setGeminiKey,
    setHunterKey,
    rememberKeys,
    setRememberKeys,
    clearKeys,
    submit,
    enrichArchetype,
    moreContacts,
    deepenCandidate,
    copyOutreach,
    retry,
    canRetry,
    stop,
  };
}
