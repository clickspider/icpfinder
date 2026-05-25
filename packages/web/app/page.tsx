// SPDX-License-Identifier: MIT

"use client";

import type { Archetype, Candidate, FindEvent } from "@icpfinder/core";
import { useCallback, useEffect, useRef, useState } from "react";

interface RunState {
  status: "idle" | "running" | "done" | "error";
  archetypes: Map<string, Archetype>;
  candidatesByArchetype: Map<string, Candidate[]>;
  totalCostCents: number;
  errors: string[];
}

const initialState: RunState = {
  status: "idle",
  archetypes: new Map(),
  candidatesByArchetype: new Map(),
  totalCostCents: 0,
  errors: [],
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
      // Skip malformed frames silently — heartbeat or partial chunk.
    }
  }
  return events;
};

export default function Page() {
  const [seed, setSeed] = useState("");
  const [state, setState] = useState<RunState>(initialState);
  const [showKeys, setShowKeys] = useState(false);
  const [geminiKey, setGeminiKey] = useState("");
  const [hunterKey, setHunterKey] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  // Hydrate BYOK keys from localStorage (browser-only).
  useEffect(() => {
    try {
      const g = window.localStorage.getItem(GEMINI_LS_KEY) ?? "";
      const h = window.localStorage.getItem(HUNTER_LS_KEY) ?? "";
      setGeminiKey(g);
      setHunterKey(h);
      if (g || h) setShowKeys(true);
    } catch {
      // localStorage may be disabled (private mode); silently ignore.
    }
  }, []);

  const persistKeys = useCallback((gemini: string, hunter: string) => {
    try {
      if (gemini) window.localStorage.setItem(GEMINI_LS_KEY, gemini);
      else window.localStorage.removeItem(GEMINI_LS_KEY);
      if (hunter) window.localStorage.setItem(HUNTER_LS_KEY, hunter);
      else window.localStorage.removeItem(HUNTER_LS_KEY);
    } catch {
      // Ignore; keys still work for the current run via state.
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
    setState({ ...initialState, status: "running" });

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
        setState((prev) => ({ ...prev, status: "error", errors: [...prev.errors, message] }));
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
      }));
    }
  }, [seed, geminiKey, hunterKey, applyEvent, persistKeys]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setState((prev) => ({ ...prev, status: "done" }));
  }, []);

  const archetypeList = Array.from(state.archetypes.values());
  const byok = Boolean(geminiKey.trim() && hunterKey.trim());

  return (
    <div className="container">
      <header className="hero">
        <h1>icpfinder</h1>
        <p>
          Paste your product. Stream buyer archetypes + verified contact emails. Open source, MIT.
        </p>
      </header>

      <section className="form">
        <textarea
          value={seed}
          placeholder="e.g. AI invoicing tool for indie SaaS founders that auto-categorizes Stripe payouts"
          onChange={(e) => setSeed(e.target.value)}
          disabled={state.status === "running"}
        />

        <div className="form-row">
          {state.status === "running" ? (
            <button type="button" onClick={stop}>
              Stop
            </button>
          ) : (
            <button type="button" onClick={submit} disabled={!seed.trim()}>
              Find my ICPs
            </button>
          )}
          <span className="hint">
            {byok
              ? "Using your keys (free, unlimited)."
              : "Free demo: 1 archetype + 3 contacts. Add keys below for unlimited."}
          </span>
        </div>

        <button type="button" className="link-button" onClick={() => setShowKeys((v) => !v)}>
          {showKeys ? "Hide" : "Use my own API keys (free, unlimited)"}
        </button>

        {showKeys && (
          <div className="byok">
            <label>
              <span>Gemini API key</span>
              <input
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AIza..."
                autoComplete="off"
              />
              <small>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Get a free key →
                </a>
              </small>
            </label>
            <label>
              <span>Hunter.io API key</span>
              <input
                type="password"
                value={hunterKey}
                onChange={(e) => setHunterKey(e.target.value)}
                placeholder="..."
                autoComplete="off"
              />
              <small>
                <a href="https://hunter.io/api-keys" target="_blank" rel="noopener noreferrer">
                  Get a free key (25/mo) →
                </a>
              </small>
            </label>
            <small className="byok-disclaimer">
              Keys stay in your browser (localStorage). Sent only with each request, never logged or
              persisted server-side.
            </small>
          </div>
        )}
      </section>

      {state.status !== "idle" && (
        <div className="status">
          <span className="badge">{state.status}</span>
          <span className="badge">{archetypeList.length} archetypes</span>
          <span className="badge">{state.totalCostCents.toFixed(2)} ¢</span>
          <span className="badge">{byok ? "byok" : "free demo"}</span>
        </div>
      )}

      {state.errors.length > 0 && (
        <div className="error">
          <ul>
            {state.errors.map((msg) => (
              <li key={msg}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      <section className="results">
        {archetypeList.map((archetype) => {
          const candidates = state.candidatesByArchetype.get(archetype.id) ?? [];
          return (
            <article key={archetype.id} className="archetype">
              <h3>{archetype.role}</h3>
              <p className="meta">
                {archetype.industry} · {archetype.companySize}
              </p>
              <p className="pain">{archetype.pain}</p>
              <div className="signals">
                {archetype.buyingSignals.map((signal) => (
                  <span key={signal} className="signal">
                    {signal}
                  </span>
                ))}
              </div>
              <div className="candidates">
                {candidates.map((candidate) => (
                  <div key={candidate.id} className="candidate">
                    <span className="name">{candidate.companyName}</span>
                    <span className="email">{candidate.contactEmail ?? candidate.domain}</span>
                    <span className="confidence">
                      {candidate.contactFirstName ?? "?"} {candidate.contactLastName ?? ""}
                      {candidate.emailConfidence ? ` · ${candidate.emailConfidence}` : ""}
                    </span>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </section>

      <footer>
        Open source, MIT.{" "}
        <a href="https://github.com/clickspider/icpfinder">github.com/clickspider/icpfinder</a>
      </footer>
    </div>
  );
}
