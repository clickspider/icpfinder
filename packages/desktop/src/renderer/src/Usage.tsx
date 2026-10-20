// SPDX-License-Identifier: MIT
//
// Usage: what IcpFinder itself took from the founder's AI plan, like the
// project usage view in Claude. Generic per provider (Claude now, Codex later).

import { useEffect, useState } from "react";
import type { State } from "../../shared/types";
import {
  emptyTotals,
  fmtTokens,
  groupBy,
  type PlanUsage,
  type Provider,
  tokensOf,
  type UsageRow,
} from "../../shared/usage";
import { api, Mark, ProductLogo, ToolLogo } from "./ui";

const fmtPct = (n?: number) =>
  n === undefined ? "…" : n > 0 && n < 0.1 ? "<0.1%" : `${n < 10 ? n.toFixed(1) : Math.round(n)}%`;

const PERIODS = [
  { days: 1, label: "Today" },
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
];

const MODEL_NAME: Record<string, string> = {
  "claude-sonnet-5-5": "Sonnet 5.5",
  "claude-opus-5-5": "Opus 5.5",
  "claude-haiku-5-5": "Haiku 5.5",
};

const Table = ({
  title,
  rows,
  total,
  name,
  models,
}: {
  title: string;
  rows: Array<[string, ReturnType<typeof emptyTotals>]>;
  total: number;
  name: (k: string) => string;
  /** Per-model split of a row: one model = a tag on the row; more = indented rows under it. */
  models?: (k: string) => Array<[string, ReturnType<typeof emptyTotals>]>;
}) => (
  <section className="panel" style={{ padding: 16 }}>
    <div className="use-row" style={{ paddingTop: 0 }}>
      <span className="lbl">{title}</span>
      <span />
      <span className="use-dim" style={{ fontSize: 11.5 }}>
        Tokens
      </span>
      <span className="use-dim" style={{ fontSize: 11.5 }}>
        Cache
      </span>
      <span className="use-dim" style={{ fontSize: 11.5 }}>
        Share
      </span>
    </div>
    {rows.length === 0 && <div style={{ fontSize: 13, color: "var(--muted)" }}>Nothing yet.</div>}
    {rows.map(([k, t]) => {
      const n = tokensOf(t);
      const share = total ? n / total : 0;
      const hit = n ? t.cacheRead / n : 0;
      const split = models?.(k) ?? [];
      return (
        <div key={k}>
          <div className="use-row">
            <span className="use-name">
              {name(k)}
              {split.length === 1 && (
                <span className="model-tag">
                  {MODEL_NAME[split[0]?.[0] ?? ""] ?? split[0]?.[0]}
                </span>
              )}
            </span>
            <span className="use-bar">
              <i style={{ width: `${Math.max(2, share * 100)}%` }} />
            </span>
            <span className="use-num">{fmtTokens(n)}</span>
            <span className="use-dim">{Math.round(hit * 100)}%</span>
            <span className="use-dim">{Math.round(share * 100)}%</span>
          </div>
          {split.length > 1 &&
            split.map(([m, mt]) => {
              const mn = tokensOf(mt);
              return (
                <div key={m} className="use-row sub">
                  <span className="use-name">
                    <span className="model-tag" style={{ marginLeft: 14 }}>
                      {MODEL_NAME[m] ?? m}
                    </span>
                  </span>
                  <span className="use-bar">
                    <i
                      style={{
                        width: `${Math.max(2, (total ? mn / total : 0) * 100)}%`,
                        opacity: 0.55,
                      }}
                    />
                  </span>
                  <span className="use-num" style={{ fontWeight: 500 }}>
                    {fmtTokens(mn)}
                  </span>
                  <span className="use-dim">{mn ? Math.round((mt.cacheRead / mn) * 100) : 0}%</span>
                  <span className="use-dim">{total ? Math.round((mn / total) * 100) : 0}%</span>
                </div>
              );
            })}
        </div>
      );
    })}
  </section>
);

export const UsageView = ({ state }: { state: State }) => {
  const [days, setDays] = useState(7);
  const [provider, setProvider] = useState<Provider>(state.settings.provider ?? "claude");
  // Products to show; empty = all of them.
  const [picked, setPicked] = useState<string[]>([]);
  const [plan, setPlan] = useState<PlanUsage | null>(null);
  useEffect(() => {
    if (provider !== "claude") {
      setPlan(null);
      return;
    }
    let live = true;
    const load = () =>
      void api()
        .planUsage()
        .then((p) => live && setPlan(p));
    load();
    const t = setInterval(load, 120_000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, [provider]);
  const byProvider: UsageRow[] = (state.usage ?? []).filter((r) => r.provider === provider);
  const products = groupBy(byProvider, days, (r) => r.ws);
  const allTokens = products.reduce((n, [, t]) => n + tokensOf(t), 0);
  const rows = picked.length ? byProvider.filter((r) => picked.includes(r.ws)) : byProvider;
  const all = groupBy(rows, days, () => "all")[0]?.[1] ?? emptyTotals();
  const total = tokensOf(all);
  const ws = (id: string) => state.workspaces.find((w) => w.id === id);
  const name = (id: string) =>
    ws(id)?.product.name ?? (id === "app" ? "Before a product" : "Archived");
  const toggle = (id: string) =>
    setPicked(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]);

  return (
    <div
      className="enter scroll"
      style={{ flex: 1, padding: 16, display: "flex", flexDirection: "column", gap: 14 }}
    >
      <header
        className="drag"
        style={{ padding: "8px 4px 0", display: "flex", alignItems: "flex-end", gap: 12 }}
      >
        <div>
          <h1 className="ob-h1">
            Your <em>usage</em>
          </h1>
          <p className="ob-sub" style={{ marginTop: 4 }}>
            Only what IcpFinder used from your plan. Your own chats are not counted.
          </p>
        </div>
        <div className="nodrag" style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <div className="ob-seg" style={{ width: 250 }}>
            <button
              type="button"
              className={provider === "claude" ? "on" : ""}
              onClick={() => setProvider("claude")}
            >
              <ToolLogo name="claude" size={13} radius={3} /> Claude
            </button>
            <button
              type="button"
              className={provider === "codex" ? "on" : ""}
              onClick={() => setProvider("codex")}
            >
              <ToolLogo name="codex" size={13} radius={3} /> Codex
            </button>
            <button
              type="button"
              className={provider === "xai" ? "on" : ""}
              onClick={() => setProvider("xai")}
            >
              Grok
            </button>
          </div>
          <div className="ob-seg" style={{ width: 230 }}>
            {PERIODS.map((p) => (
              <button
                key={p.days}
                type="button"
                className={days === p.days ? "on" : ""}
                onClick={() => setDays(p.days)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="use-products">
        <button
          type="button"
          className={`use-prod ${picked.length === 0 ? "on" : ""}`}
          onClick={() => setPicked([])}
        >
          <span className="use-prod-logo all">All</span>
          <span>
            <b>All products</b>
            <small>{fmtTokens(allTokens)}</small>
          </span>
        </button>
        {products.map(([id, t]) => {
          const w = ws(id);
          return (
            <button
              key={id}
              type="button"
              className={`use-prod ${picked.includes(id) ? "on" : ""}`}
              aria-pressed={picked.includes(id)}
              onClick={() => toggle(id)}
            >
              {w ? (
                <ProductLogo product={w.product} size={30} radius={8} />
              ) : id === "app" ? (
                <Mark size={30} radius={8} />
              ) : (
                <span className="use-prod-logo">?</span>
              )}
              <span>
                <b>{name(id)}</b>
                <small>
                  {fmtTokens(tokensOf(t))} ·{" "}
                  {allTokens ? Math.round((tokensOf(t) / allTokens) * 100) : 0}%
                </small>
              </span>
            </button>
          );
        })}
      </div>

      <section
        className="panel"
        style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}
      >
        <div style={{ display: "flex", alignItems: "baseline" }}>
          <div className="lbl">
            Your {provider === "claude" ? "Claude" : provider === "codex" ? "Codex" : "Grok"} plan
          </div>
          <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--muted)" }}>
            {plan ? `${plan.plan} · as Claude Code reports it` : ""}
          </span>
        </div>
        {plan?.windows.map((w) => (
          <div key={w.label} className="plan-row">
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <b>{w.label}</b>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>
                {w.resets && `resets ${w.resets}`}
              </span>
              <span style={{ marginLeft: "auto", fontSize: 12.5 }}>
                <b style={{ color: "#e0244a" }}>IcpFinder ≈ {fmtPct(w.appPct)}</b>
                <span style={{ color: "var(--muted)" }}> of {w.pct}% used</span>
              </span>
            </div>
            <div className="plan-bar">
              <i className="app" style={{ width: `${Math.min(100, w.appPct ?? 0)}%` }} />
              <i className="rest" style={{ width: `${Math.max(0, w.pct - (w.appPct ?? 0))}%` }} />
            </div>
          </div>
        ))}
        {!plan?.windows.length && (
          <div style={{ fontSize: 13, color: "var(--muted)" }}>
            Plan limits are unavailable here. Recorded IcpFinder usage is shown below.
          </div>
        )}
      </section>

      <section
        className="panel"
        style={{ padding: 18, display: "flex", gap: 28, flexWrap: "wrap" }}
      >
        <div>
          <div className="use-big">{fmtTokens(total)}</div>
          <div className="use-cap">tokens IcpFinder used</div>
        </div>
        <div>
          <div className="use-big">{all.calls}</div>
          <div className="use-cap">AI runs</div>
        </div>
        <div>
          <div className="use-big">{total ? Math.round((all.cacheRead / total) * 100) : 0}%</div>
          <div className="use-cap">cache hit (lighter on your plan)</div>
        </div>
        <div>
          <div className="use-big">{all.webSearches}</div>
          <div className="use-cap">web searches</div>
        </div>
      </section>

      <Table
        title="By task and model"
        rows={groupBy(rows, days, (r) => r.task)}
        total={total}
        name={(k) => k}
        models={(k) =>
          groupBy(
            rows.filter((r) => r.task === k),
            days,
            (r) => r.model
          )
        }
      />
      <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
        Red is IcpFinder's part, grey is everything else on your account. IcpFinder's part is an
        estimate: its own runs are counted exactly and set against Claude Code's other work on this
        Mac. Use on claude.ai or other devices is not visible here, so the real part is a bit
        smaller.
      </div>
    </div>
  );
};
