// SPDX-License-Identifier: MIT
//
// Your product page: what IcpFinder knows, editable, plus re-calibrate.

import { useState } from "react";
import type { Product, State, Workspace } from "../../shared/types";
import { api, FactField, ProductLogo, Spinner } from "./ui";

const FIELDS: Array<[keyof Product, string]> = [
  ["sell", "What you sell"],
  ["problem", "The problem you solve"],
  ["different", "What makes you different"],
  ["price", "Pricing"],
];

export const ProductView = ({ ws, onState }: { ws: Workspace; onState: (s: State) => void }) => {
  const p = ws.product;
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const companies = ws.icps.reduce((n, i) => n + i.companies.length, 0);

  const [warn, setWarn] = useState<string | null>(null);

  const recalibrate = async () => {
    setError(null);
    setWarn(null);
    try {
      setBusy("Re-reading your site and ICPs…");
      onState(await api().recalibrate());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  // Warn first when Claude is still working for this product.
  const ask = async () => {
    const b = await api().busyWork();
    const parts = [
      b.hunts && `${b.hunts} hunt${b.hunts > 1 ? "s" : ""}`,
      b.research && `${b.research} research${b.research > 1 ? "es" : ""}`,
      b.actions && `${b.actions} next step${b.actions > 1 ? "s" : ""}`,
      b.agent && "the browser agent",
    ].filter(Boolean);
    if (parts.length) setWarn(parts.join(", "));
    else void recalibrate();
  };

  return (
    <div
      className="enter scroll"
      style={{ flex: 1, display: "flex", flexDirection: "column", padding: 16, gap: 16 }}
    >
      <header
        className="drag"
        style={{
          borderRadius: 18,
          background: "#f5f5f7",
          padding: "22px 24px",
          display: "flex",
          alignItems: "center",
          gap: 18,
          boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,0.06)",
        }}
      >
        <ProductLogo product={p} size={72} radius={20} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>Your product</div>
          <h1
            style={{
              margin: "2px 0 0",
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: "-0.025em",
              lineHeight: 1.1,
            }}
          >
            {p.name}
          </h1>
          <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 4 }}>
            {p.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
          </div>
        </div>
      </header>
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <section
          className="panel"
          style={{ flex: 1.4, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <h2 style={{ margin: 0, fontSize: 15 }}>What IcpFinder knows</h2>
            <div style={{ marginLeft: "auto", fontSize: 12, color: "var(--faint)" }}>
              read from {p.url.replace(/^https?:\/\//, "")} · edit anything
            </div>
          </div>
          {FIELDS.map(([k, label]) => (
            <FactField
              key={`${k}-${p.readAt}`}
              kind={k}
              label={label}
              value={String(p[k] ?? "")}
              onSave={(v) =>
                void api()
                  .updateProduct({ [k]: v })
                  .then(onState)
              }
            />
          ))}
        </section>
        <aside
          className="panel"
          style={{ flex: 1, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}
        >
          <h2 style={{ margin: 0, fontSize: 15 }}>Re-calibrate</h2>
          <p style={{ margin: 0, color: "var(--ink-2)", lineHeight: 1.55 }}>
            Re-read your site and ICPs. Research stays.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>ICPs</span>
              <span style={{ color: "var(--faint)" }}>{ws.icps.length}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Companies</span>
              <span style={{ color: "var(--faint)" }}>{companies}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Last read of your site</span>
              <span style={{ color: "var(--faint)" }}>
                {new Date(p.readAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          {error && <p className="error">{error}</p>}
          {warn && !busy && (
            <div
              className="pop"
              role="alert"
              style={{
                padding: 14,
                borderRadius: 12,
                background: "#fff8eb",
                boxShadow: "inset 0 0 0 1px #f5c56b",
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              <div style={{ fontWeight: 600, color: "#8a5300" }}>⚠ Pauses Claude</div>
              <div style={{ marginTop: 4, color: "var(--ink-2)" }}>
                Stops {warn}. Approved research resumes after.
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button
                  type="button"
                  className="primary btn"
                  style={{ flex: 1, height: 36 }}
                  onClick={() => void recalibrate()}
                >
                  Stop and re-calibrate
                </button>
                <button
                  type="button"
                  className="secondary btn"
                  style={{ height: 36 }}
                  onClick={() => setWarn(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          <button
            type="button"
            className="primary btn"
            disabled={Boolean(busy) || Boolean(warn)}
            onClick={() => void ask()}
          >
            {busy ? (
              <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                <Spinner />
                {busy}
              </span>
            ) : (
              "Re-read my site and re-check"
            )}
          </button>
        </aside>
      </div>
    </div>
  );
};
