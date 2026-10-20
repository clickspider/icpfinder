// SPDX-License-Identifier: MIT
//
// ICP launcher: the product (workspace) on top, ICPs as the main entities below.

import { useState } from "react";
import { scoringOf } from "../../shared/scoring";
import type { State, Workspace } from "../../shared/types";
import { emptyTotals, fmtTokens, groupBy, tokensOf } from "../../shared/usage";
import type { View } from "./App";
import { api, IcpArt, ModelPicker, ProductLogo, proven, Spinner, ToolLogo } from "./ui";

const Icon = ({ d, s }: { d: string; s: number }) => (
  <svg
    aria-hidden="true"
    width={s}
    height={s}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={d} />
  </svg>
);

export const Sidebar = ({
  state,
  ws,
  view,
  go,
  onState,
}: {
  state: State;
  ws: Workspace;
  view: View | null;
  go: (v: View) => void;
  onState: (s: State) => void;
}) => {
  const [menu, setMenu] = useState(false);
  const [finding, setFinding] = useState(false);
  const busy = ws.icps.some((i) => i.companies.some((c) => c.status === "researching"));

  return (
    <nav className="side drag" aria-label="ICPs" style={{ position: "relative" }}>
      <button
        type="button"
        className={`side-row btn ${view?.kind === "product" ? "on" : ""}`}
        onClick={() => go({ kind: "product" })}
      >
        <ProductLogo product={ws.product} size={36} radius={10} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 700,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {ws.product.name}
          </div>
          <div style={{ fontSize: 11, color: "var(--faint)" }}>Your product</div>
        </div>
      </button>
      <button
        type="button"
        className="btn"
        aria-label="Switch workspace"
        aria-expanded={menu}
        style={{
          position: "absolute",
          right: 14,
          top: 54,
          width: 28,
          height: 28,
          borderRadius: 7,
          background: "transparent",
          color: "var(--faint)",
        }}
        onClick={() => setMenu(!menu)}
      >
        ⌄
      </button>

      {menu && (
        <div className="popover pop" role="menu">
          <div style={{ display: "flex", alignItems: "center", padding: "4px 4px 6px 8px" }}>
            <span style={{ fontSize: 11, color: "var(--faint)" }}>Workspaces</span>
            <button
              type="button"
              className="btn"
              title="New workspace for another product"
              style={{
                marginLeft: "auto",
                height: 26,
                padding: "0 10px",
                borderRadius: 7,
                background: "#fff0f3",
                color: "var(--accent)",
                fontSize: 12,
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
              onClick={() => {
                setMenu(false);
                void api().newWorkspace().then(onState);
              }}
            >
              <Icon d="M12 5v14 M5 12h14" s={12} />
              New
            </button>
          </div>
          {state.workspaces
            .filter((w) => w.setupDone && !w.archived)
            .map((w, _i, shown) => (
              <div key={w.id} className="ws-row">
                <button
                  type="button"
                  role="menuitem"
                  className="menu-item btn"
                  style={{ fontWeight: w.id === ws.id ? 600 : 400 }}
                  onClick={() => {
                    setMenu(false);
                    void api().switchWorkspace(w.id).then(onState);
                  }}
                >
                  <ProductLogo product={w.product} size={18} radius={5} />
                  {w.product.name}
                </button>
                {shown.length > 1 && (
                  <button
                    type="button"
                    className="btn ws-archive"
                    aria-label={`Archive ${w.product.name}`}
                    title="Archive (hides it, keeps the data)"
                    onClick={() => void api().archiveWorkspace(w.id).then(onState)}
                  >
                    <Icon d="M3 5h18v4H3z M5 9v10h14V9 M10 13h4" s={14} />
                  </button>
                )}
              </div>
            ))}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", padding: "16px 10px 6px" }}>
        <div className="lbl">Your ICPs</div>
        <div style={{ marginLeft: "auto", fontSize: 11, color: "var(--faint)" }}>
          {ws.icps.length}
        </div>
      </div>

      <div className="scroll" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {ws.icps.map((icp) => {
          const on =
            view?.kind === "icp" || view?.kind === "company" ? view.icpId === icp.id : false;
          const nApproved = icp.companies.filter((c) => c.approval === "approved").length;
          const _nProven = icp.companies.reduce(
            (n, c) => n + (proven(c.research).length > 0 ? 1 : 0),
            0
          );
          const researching = icp.companies.some(
            (c) => c.status === "researching" || c.status === "queued"
          );
          const running = Boolean(icp.sourcing) || researching;
          const matches = icp.companies.filter(
            (c) => (c.match ?? 0) >= scoringOf(ws.scoring).bar && c.approval !== "rejected"
          ).length;
          return (
            <button
              key={icp.id}
              type="button"
              className={`side-row btn ${on ? "on" : ""}`}
              onClick={() => go({ kind: "icp", icpId: icp.id })}
            >
              <div
                style={{
                  borderRadius: 12,
                  boxShadow: on ? "0 6px 14px rgba(0,0,0,0.18)" : undefined,
                }}
              >
                <IcpArt icp={icp} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{icp.name}</div>
                <div
                  style={{
                    fontSize: 11,
                    color: !icp.hunted ? "var(--faint)" : running ? "var(--accent)" : "#1f8a43",
                  }}
                >
                  {icp.sourcing
                    ? matches
                      ? `Searching… · ${matches} so far`
                      : "Searching…"
                    : !icp.hunted
                      ? "Not hunted yet"
                      : researching
                        ? `Researching · ${matches} ${matches === 1 ? "match" : "matches"}`
                        : `${matches} ${matches === 1 ? "match" : "matches"}${nApproved ? ` · ${nApproved} approved` : ""}`}
                </div>
              </div>
            </button>
          );
        })}
        <button
          type="button"
          className="btn find-more"
          disabled={finding}
          onClick={() => {
            setFinding(true);
            void api()
              .findIcps()
              .then(onState)
              .finally(() => setFinding(false));
          }}
        >
          {finding ? <Spinner /> : <Icon d="M12 5v14 M5 12h14" s={14} />}
          {finding ? "Finding ICPs…" : "Find more ICPs"}
        </button>
      </div>

      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
        <button
          type="button"
          className={`side-row btn ${view?.kind === "connectors" ? "on" : ""}`}
          onClick={() => go({ kind: "connectors" })}
        >
          <div
            aria-hidden="true"
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              background: "#f2f2f4",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              aria-hidden="true"
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#3c3c43"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 7V3 M15 7V3 M7 7h10v4a5 5 0 01-10 0z M12 16v5" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Connectors</div>
            <div style={{ fontSize: 11, color: "var(--faint)" }}>
              <span style={{ display: "inline-flex", gap: 4, marginTop: 3 }}>
                {["claude", "codex", "hunter", "gmail", "linkedin"].map((n) => (
                  <ToolLogo key={n} name={n} size={14} radius={4} />
                ))}
              </span>
            </div>
          </div>
        </button>
        <div
          style={{
            padding: "4px 10px 2px",
            fontSize: 12,
            color: "var(--muted)",
            display: "flex",
            gap: 6,
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              background: busy ? "var(--accent)" : "#34c759",
            }}
          />
          {busy ? (
            "Researching…"
          ) : (
            <ModelPicker
              provider={state.settings.provider ?? "claude"}
              value={state.settings.model}
              onChange={(m) => void api().saveSettings({ model: m }).then(onState)}
              size={14}
            />
          )}
          <button
            type="button"
            className="ghost btn"
            style={{ marginLeft: "auto", fontSize: 11.5, padding: "2px 6px" }}
            title="What IcpFinder used from your plan"
            onClick={() => go({ kind: "usage" })}
          >
            {fmtTokens(
              tokensOf(
                groupBy(
                  (state.usage ?? []).filter((r) => r.provider === "claude"),
                  1,
                  () => "t"
                )[0]?.[1] ?? emptyTotals()
              )
            )}{" "}
            today
          </button>
        </div>
      </div>
    </nav>
  );
};
