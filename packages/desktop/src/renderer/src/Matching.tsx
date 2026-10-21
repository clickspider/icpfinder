// SPDX-License-Identifier: MIT
//
// How we match, per product: every knob of the score, with a live preview.
// Deterministic: the same checks and settings always give the same score.
// Saving re-scores every company in code; no new searches, no tokens.

import { useEffect, useState } from "react";
import { BASE, DEFAULT_SCORING, type Scoring, score, scoringOf } from "../../shared/scoring";
import type { State, Workspace } from "../../shared/types";
import { api } from "./ui";

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

/** Three typical companies, so a change shows what it does at once. */
const SAMPLES = [
  {
    name: "Strong fit",
    note: "4 of 5 must-haves, fresh signal",
    input: {
      checks: ["yes", "yes", "yes", "yes", "unknown"] as const,
      signalConfirmed: true,
      signalDate: daysAgo(20),
    },
  },
  {
    name: "Maybe",
    note: "3 of 5, signal is 5 months old",
    input: {
      checks: ["yes", "yes", "yes", "unknown", "unknown"] as const,
      signalConfirmed: true,
      signalDate: daysAgo(150),
    },
  },
  {
    name: "Long shot",
    note: "2 of 5, signal not confirmed",
    input: {
      checks: ["yes", "yes", "unknown", "unknown", "unknown"] as const,
      signalConfirmed: false,
    },
  },
];

const Knob = ({
  label,
  hint,
  value,
  min,
  max,
  step = 1,
  show,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  show: string;
  onChange: (v: number) => void;
}) => (
  <label className="knob">
    <div style={{ display: "flex", alignItems: "baseline" }}>
      <span style={{ fontWeight: 600 }}>{label}</span>
      <span className="knob-val">{show}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    />
    <span className="knob-hint">{hint}</span>
  </label>
);

export const MatchingView = ({
  ws,
  onState,
  onBack,
}: {
  ws: Workspace;
  onState: (s: State) => void;
  onBack: () => void;
}) => {
  const [cfg, setCfg] = useState<Scoring>(scoringOf(ws.scoring));
  useEffect(() => setCfg(scoringOf(ws.scoring)), [ws.scoring]);

  // Save shortly after the last move; the main process re-scores every company.
  useEffect(() => {
    const same = JSON.stringify(cfg) === JSON.stringify(scoringOf(ws.scoring));
    if (same) return;
    const t = setTimeout(() => void api().saveScoring(cfg).then(onState), 350);
    return () => clearTimeout(t);
  }, [cfg, ws.scoring, onState]);

  const set = (patch: Partial<Scoring>) => setCfg({ ...cfg, ...patch });
  const all = ws.icps.flatMap((i) => i.companies).filter((c) => c.approval !== "rejected");
  const strong = all.filter((c) => (c.match ?? 0) >= cfg.bar).length;
  const signal = 100 - BASE - cfg.mustWeight;

  return (
    <div
      className="enter scroll"
      style={{ flex: 1, padding: 16, display: "flex", flexDirection: "column", gap: 16 }}
    >
      <header
        className="drag"
        style={{ padding: "8px 4px 0", display: "flex", alignItems: "flex-end" }}
      >
        <div>
          <button type="button" className="ghost btn nodrag page-back" onClick={onBack}>
            ← Back
          </button>
          <h1 className="ob-h1">
            How we <em>match</em>
          </h1>
          <p className="ob-sub" style={{ marginTop: 4 }}>
            For {ws.product.name} only. Same facts, same score. Changes re-score without a new
            search.
          </p>
        </div>
        <button
          type="button"
          className="ghost btn nodrag"
          style={{ marginLeft: "auto" }}
          onClick={() => {
            setCfg(DEFAULT_SCORING);
            void api().saveScoring(null).then(onState);
          }}
        >
          Reset
        </button>
      </header>

      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <section
          className="panel"
          style={{ flex: 1.3, padding: 18, display: "flex", flexDirection: "column", gap: 18 }}
        >
          <Knob
            label="Show companies from"
            hint="Lower shows more companies. Higher shows only the best."
            value={cfg.bar}
            min={40}
            max={95}
            show={`${cfg.bar} / 100`}
            onChange={(v) => set({ bar: v })}
          />
          <Knob
            label="Fit vs. timing"
            hint={`Fit = the must-haves. Timing = a fresh buying signal. Every score starts at ${BASE}.`}
            value={cfg.mustWeight}
            min={30}
            max={80}
            step={5}
            show={`fit ${cfg.mustWeight} · timing ${signal}`}
            onChange={(v) => set({ mustWeight: v })}
          />
          <Knob
            label="Benefit of the doubt"
            hint="Credit for a must-have that no public page confirms or rules out."
            value={Math.round(cfg.unknownCredit * 100)}
            min={0}
            max={50}
            step={5}
            show={`${Math.round(cfg.unknownCredit * 100)}%`}
            onChange={(v) => set({ unknownCredit: v / 100 })}
          />
          <Knob
            label="A signal is fresh for"
            hint="Older signals count half."
            value={cfg.windowDays}
            min={30}
            max={365}
            step={15}
            show={`${cfg.windowDays} days`}
            onChange={(v) => set({ windowDays: v })}
          />
          <div style={{ height: 0.5, background: "rgba(0,0,0,0.08)" }} />
          <Knob
            label="Companies per search"
            hint="More finds more, and uses more Claude time."
            value={cfg.candidates}
            min={8}
            max={30}
            show={`${cfg.candidates}`}
            onChange={(v) => set({ candidates: v })}
          />
          <Knob
            label="Sharpen rounds"
            hint="When too few pass, Claude sharpens one check and searches again."
            value={cfg.rounds}
            min={0}
            max={4}
            show={cfg.rounds === 0 ? "off" : `up to ${cfg.rounds}`}
            onChange={(v) => set({ rounds: v })}
          />
        </section>

        <aside
          className="panel"
          style={{ flex: 1, padding: 18, display: "flex", flexDirection: "column", gap: 12 }}
        >
          <div className="lbl">Live preview</div>
          {SAMPLES.map((s) => {
            const v = score(
              { ...s.input, checks: s.input.checks.map((x) => ({ verdict: x })) },
              cfg
            );
            const pass = v >= cfg.bar;
            return (
              <div key={s.name} className="sample">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{s.note}</div>
                </div>
                <span className={`sample-score ${pass ? "in" : "out"}`}>{v}</span>
                <span style={{ width: 54, fontSize: 12, color: pass ? "#1f8a43" : "var(--faint)" }}>
                  {pass ? "shown" : "hidden"}
                </span>
              </div>
            );
          })}
          <div style={{ height: 0.5, background: "rgba(0,0,0,0.08)" }} />
          <div style={{ fontSize: 13 }}>
            <b style={{ color: "#1f8a43" }}>{strong}</b> of {all.length} companies you found show
            with this setup.
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
            A proven "no" or a deal-breaker is always 0.
          </div>
        </aside>
      </div>
    </div>
  );
};
