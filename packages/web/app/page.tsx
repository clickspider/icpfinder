// SPDX-License-Identifier: MIT

"use client";

import type { Archetype, Candidate, FindEvent } from "@icpfinder/core";
import { useCallback, useRef, useState } from "react";

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
  const abortRef = useRef<AbortController | null>(null);

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

    setState({ ...initialState, status: "running" });

    try {
      const response = await fetch("/api/find", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ seed }),
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
  }, [seed, applyEvent]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setState((prev) => ({ ...prev, status: "done" }));
  }, []);

  const archetypeList = Array.from(state.archetypes.values());

  return (
    <div className="container">
      <header className="hero">
        <h1>icpfinder</h1>
        <p>Paste your product. Get three buyer archetypes and lookalike companies in 30 seconds.</p>
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
            Runs in stub mode by default. Set GEMINI_API_KEY + HUNTER_API_KEY for live data.
          </span>
        </div>
      </section>

      {state.status !== "idle" && (
        <div className="status">
          <span className="badge">status: {state.status}</span>
          <span className="badge">archetypes: {archetypeList.length}</span>
          <span className="badge">cost: {state.totalCostCents.toFixed(2)} ¢</span>
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
