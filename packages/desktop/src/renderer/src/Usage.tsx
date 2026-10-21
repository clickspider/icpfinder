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
      <span className="use-dim" title="Cached-token share" style={{ fontSize: 11.5 }}>
        Cached
      </span>
      <span className="use-dim" title="Share of recorded tokens" style={{ fontSize: 11.5 }}>
        Share
      </span>
    </div>
    {rows.length === 0 && (
      <div style={{ fontSize: 13, color: "var(--muted)" }}>
        No usage recorded for this selection.
      </div>
    )}
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
  const [planLoading, setPlanLoading] = useState(false);
  const [planAt, setPlanAt] = useState("");
  useEffect(() => {
    setPlan(null);
    setPlanAt("");
    if (provider !== "claude") {
      setPlan(null);
      return;
    }
    let live = true;
    const load = () => {
      setPlanLoading(true);
      void api()
        .planUsage()
        .then((p) => {
          if (live) {
            setPlan(p);
            setPlanAt(new Date().toLocaleTimeString());
          }
        })
        .catch(() => {
          if (live) setPlan(null);
        })
        .finally(() => {
          if (live) setPlanLoading(false);
        });
    };
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
    ws(id)?.product.name ?? (id === "app" ? "Setup activity" : "Archived");
  const toggle = (id: string) =>
    setPicked(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]);

  return (
    <div
      className="enter scroll native-page native-usage"
      style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}
    >
      <header
        className="drag"
        style={{ padding: "8px 4px 0", display: "flex", alignItems: "flex-end", gap: 12 }}
      >
        <div>
          <h1>IcpFinder usage</h1>
          <p style={{ marginTop: 4 }}>
            Recorded activity in IcpFinder, filtered by provider and period.
          </p>
        </div>
        <div className="nodrag native-usage-filters">
          <div>
            <div className="native-muted">Provider</div>
            <fieldset className="ob-seg" aria-label="Provider">
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
                <ToolLogo name="codex" size={13} radius={3} /> ChatGPT
              </button>
              <button
                type="button"
                className={provider === "xai" ? "on" : ""}
                onClick={() => setProvider("xai")}
              >
                Grok
              </button>
            </fieldset>
          </div>
          <div>
            <div className="native-muted">Period</div>
            <fieldset className="ob-seg" aria-label="Period">
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
            </fieldset>
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
            <b>All businesses</b>
            <small>{fmtTokens(allTokens)} tokens</small>
          </span>
        </button>
        {[
          ...products,
          ...picked
            .filter((id) => !products.some(([key]) => key === id))
            .map((id) => [id, emptyTotals()] as [string, ReturnType<typeof emptyTotals>]),
        ].map(([id, t]) => {
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
                  {fmtTokens(tokensOf(t))} tokens ·{" "}
                  {allTokens ? Math.round((tokensOf(t) / allTokens) * 100) : 0}%
                </small>
              </span>
            </button>
          );
        })}
      </div>

      <section
        className="panel"
        style={{ padding: 18, display: "flex", gap: 28, flexWrap: "wrap" }}
      >
        <div>
          <div className="use-big">{fmtTokens(total)}</div>
          <div className="use-cap">Tokens recorded</div>
        </div>
        <div>
          <div className="use-big">{all.calls}</div>
          <div className="use-cap">AI runs recorded</div>
        </div>
        <div>
          <div className="use-big">{total ? Math.round((all.cacheRead / total) * 100) : 0}%</div>
          <div className="use-cap">Cached-token share</div>
        </div>
        <div>
          <div className="use-big">{all.webSearches}</div>
          <div className="use-cap">Web searches recorded</div>
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
      <p className="native-muted">
        This view shows recorded activity, which may not include every request. Cached-token share
        is the proportion of recorded tokens read from cache.
      </p>
      {provider === "claude" && (
        <details className="native-disclosure">
          <summary>Account usage reported by Claude</summary>
          {planAt && <p>Last checked: {planAt}</p>}
          {planLoading && <p role="status">Checking account usage…</p>}
          {!planLoading && !plan?.windows.length && (
            <p>Account usage is unavailable. Recorded IcpFinder activity is shown above.</p>
          )}
          {plan?.windows.map((w) => (
            <div className="native-plan-row" key={w.label}>
              <h2>{w.label}</h2>
              <p>
                Account usage: {w.pct}%{w.resets ? ` · resets ${w.resets}` : ""}
              </p>
              <p>
                Estimated IcpFinder contribution:{" "}
                {w.appPct === undefined
                  ? "Unavailable"
                  : `${Number(w.appPct.toFixed(1))} percentage points`}
              </p>
            </div>
          ))}
          {Boolean(plan?.windows.length) && (
            <p>
              IcpFinder’s share is estimated from recorded IcpFinder activity and local Claude
              activity. Activity on other devices or services may be missing, so this is not an
              exact breakdown.
            </p>
          )}
        </details>
      )}
    </div>
  );
};
