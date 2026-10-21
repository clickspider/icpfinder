import { useState } from "react";
import { icpPresentation } from "../../shared/onboarding";
import type { State, Workspace } from "../../shared/types";
import type { View } from "./App";
import { profileStatus } from "./dashboard-state";
import { api, Mark, ProductLogo, Spinner } from "./ui";

const Icon = ({ d, s }: { d: string; s: number }) => (
  <svg
    aria-hidden="true"
    width={s}
    height={s}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
  >
    <path d={d} />
  </svg>
);
export function Sidebar({
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
}) {
  const [menu, setMenu] = useState(false);
  const [finding, setFinding] = useState(false);
  const provider = { claude: "Claude", codex: "ChatGPT", xai: "Grok" }[
    state.settings.provider ?? "claude"
  ];
  return (
    <nav className="side native-sidebar drag" aria-label="Workspace">
      <div className="native-brand">
        <Mark size={28} radius={9} />
        <span>IcpFinder</span>
      </div>
      <div className="native-business">
        <button
          type="button"
          className={`side-row btn ${view?.kind === "product" ? "on" : ""}`}
          onClick={() => go({ kind: "product" })}
        >
          <ProductLogo product={ws.product} size={35} radius={10} />
          <span>
            <b>{ws.product.name}</b>
            <small>Your business</small>
          </span>
        </button>
        <button
          type="button"
          className="btn native-switch"
          aria-label="Switch business"
          aria-expanded={menu}
          onClick={() => setMenu(!menu)}
        >
          ⌄
        </button>
      </div>
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
                    void api()
                      .switchWorkspace(w.id)
                      .then((next) => {
                        onState(next);
                        go({ kind: "overview" });
                      });
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

      <button
        type="button"
        className={`side-row btn native-overview-link ${view?.kind === "overview" ? "on" : ""}`}
        onClick={() => go({ kind: "overview" })}
      >
        <Icon d="M3 11 12 3l9 8M5 10v11h5v-6h4v6h5V10" s={18} />
        Overview
      </button>
      <div className="native-sidebar-label">
        <span>Customer profiles</span>
        <span>{ws.icps.length}</span>
      </div>
      <div className="scroll native-sidebar-profiles">
        {ws.icps.map((icp, i) => {
          const on = (view?.kind === "icp" || view?.kind === "company") && view.icpId === icp.id;
          return (
            <button
              key={icp.id}
              type="button"
              className={`side-row btn native-profile-nav ${on ? "on" : ""}`}
              onClick={() => go({ kind: "icp", icpId: icp.id })}
            >
              <span className="native-profile-symbol" aria-hidden="true">
                {["◉", "◫", "◎"][i % 3]}
              </span>
              <span>
                <b>{icpPresentation(icp).title}</b>
                <small>{profileStatus(icp, ws)}</small>
              </span>
            </button>
          );
        })}
        <button
          type="button"
          className="btn native-suggest"
          disabled={finding}
          onClick={() => {
            setFinding(true);
            void api()
              .findIcps()
              .then(onState)
              .finally(() => setFinding(false));
          }}
        >
          {finding ? <Spinner /> : "＋"}{" "}
          {finding ? "Suggesting profiles…" : "Suggest more profiles"}
        </button>
      </div>
      <footer className="native-sidebar-footer">
        <button
          type="button"
          className={`side-row btn ${view?.kind === "settings" ? "on" : ""}`}
          onClick={() => go({ kind: "settings" })}
        >
          <Icon d="M4 6h16M4 12h16M4 18h16M8 3v6m8 0v6m-8 0v6" s={18} />
          Settings
        </button>
        <div>
          <button type="button" className="btn ghost" onClick={() => go({ kind: "settings" })}>
            Provider · {provider}
          </button>
          <button type="button" className="btn ghost" onClick={() => go({ kind: "usage" })}>
            Usage
          </button>
        </div>
      </footer>
    </nav>
  );
}
