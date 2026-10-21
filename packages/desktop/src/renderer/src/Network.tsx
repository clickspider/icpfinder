// SPDX-License-Identifier: MIT
//
// Your network: who you already know at the companies IcpFinder found.
// Value first (the header), then one card per source with two ways in:
// do it yourself, or let Claude do it in the live browser. Files are read
// on this Mac and never uploaded.

import { useRef, useState } from "react";
import { scoringOf } from "../../shared/scoring";
import type { State, Workspace } from "../../shared/types";
import type { View } from "./App";
import { api, cleanError, initial, ToolLogo } from "./ui";

const LI_PAGE = "https://www.linkedin.com/mypreferences/d/download-my-data";
const LI_TASK =
  "Open LinkedIn's 'Download your data' page. Choose 'Download larger data archive', then the 'Request archive' button. Ask the founder before you click 'Request archive'. If LinkedIn asks to log in or for a password, say so and stop.";

const day = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "";

export const NetworkView = ({
  state,
  ws,
  onState,
  go,
}: {
  state: State;
  ws: Workspace;
  onState: (s: State) => void;
  go: (v: View) => void;
}) => {
  const [open, setOpen] = useState<"linkedin" | null>(state.contacts.length ? null : "linkedin");
  const candidates = ws.icps
    .flatMap((i) => i.companies)
    .filter((c) => (c.match ?? 0) >= scoringOf(ws.scoring).bar && c.approval !== "rejected");
  const companies = [
    ...new Map(
      candidates.map((c) => [
        c.domain,
        {
          ...c,
          warm: candidates
            .filter((x) => x.domain === c.domain)
            .flatMap((x) => x.warm ?? [])
            .filter(
              (x, i, a) =>
                a.findIndex(
                  (y) => y.name === x.name && y.company === x.company && y.url === x.url
                ) === i
            ),
        },
      ])
    ).values(),
  ];
  const warm = companies.filter((c) => (c.warm?.length ?? 0) > 0);
  const connected = state.contacts.length > 0;

  return (
    <div
      className="enter scroll native-page native-network"
      style={{ flex: 1, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <header className="drag" style={{ padding: "8px 4px 0" }}>
        <h1>Find your way in</h1>
        <p style={{ marginTop: 4 }}>
          Explore who you already know at companies you’re considering.
        </p>
      </header>

      {connected && (
        <section className="panel" style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span
              style={{ fontSize: 34, fontWeight: 800, color: "#1f8a43", letterSpacing: "-0.02em" }}
            >
              {warm.length}
            </span>
            <span style={{ fontSize: 15, color: "var(--muted)" }}>of {companies.length}</span>
            <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--faint)" }}>
              {warm.length === 0 && companies.length > 0
                ? "No connection found in this export"
                : ""}
            </span>
          </div>
          <div style={{ fontWeight: 600, marginTop: 2 }}>
            companies with a connection in your imported network
          </div>
          <div className="net-bar">
            <i
              style={{ width: `${companies.length ? (warm.length / companies.length) * 100 : 0}%` }}
            />
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 14 }}>
            {[...warm, ...companies.filter((c) => !c.warm?.length)].slice(0, 12).map((c) => {
              const n = c.warm?.length ?? 0;
              return (
                <div key={c.domain} className={`net-co ${n ? "" : "cold"}`} title={c.name}>
                  <span className="net-logo">
                    {c.logo ? <img src={c.logo} alt="" /> : initial(c.name)}
                    {n > 0 && <b>{n}</b>}
                  </span>
                  <span className="net-name">{c.name}</span>
                </div>
              );
            })}
            {companies.length === 0 && (
              <div style={{ fontSize: 13, color: "var(--muted)" }}>
                Find companies from a business customer profile to see connections here.
              </div>
            )}
          </div>
        </section>
      )}

      <div style={{ display: "flex", alignItems: "center" }}>
        <div className="lbl">Your sources</div>
        <div style={{ marginLeft: "auto", fontSize: 12, color: "var(--faint)" }}>
          {connected ? `${state.contacts.length} connections imported` : "No connections imported"}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
        <button
          type="button"
          className={`btn net-card ${open === "linkedin" ? "on" : ""}`}
          onClick={() => setOpen(open === "linkedin" ? null : "linkedin")}
        >
          <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
            <ToolLogo name="linkedin" size={40} radius={10} />
            {connected && <span className="net-ok">✓</span>}
          </div>
          <div className="net-title">LinkedIn</div>
          <div className="net-sub">
            Use your exported connections to look for possible introductions.
          </div>
          <div className="net-state" style={{ color: connected ? "#1f8a43" : "var(--ink-2)" }}>
            {connected
              ? `${state.contacts.length.toLocaleString()} connections imported`
              : "Import your connections"}
            <span className="net-chev">{open === "linkedin" ? "⌃" : "⌄"}</span>
          </div>
        </button>
      </div>

      {open === "linkedin" && (
        <LinkedInPanel state={state} onState={onState} go={go} connected={connected} />
      )}
    </div>
  );
};

const LinkedInPanel = ({
  state,
  onState,
  go,
  connected,
}: {
  state: State;
  onState: (s: State) => void;
  go: (v: View) => void;
  connected: boolean;
}) => {
  const [mode, setMode] = useState<"me" | "claude">("me");
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sure, setSure] = useState(false);
  const pick = useRef<HTMLInputElement>(null);
  const li = state.network?.linkedin;

  const use = async (f?: File) => {
    if (!f) return;
    setBusy(true);
    setErr(null);
    try {
      onState(await api().importNetwork(f.name, await f.arrayBuffer()));
    } catch (e) {
      setErr(cleanError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      className="panel rise"
      style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1, fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5 }}>
          {connected
            ? `Imported ${day(li?.importedAt)}. Import a newer export to update your connections.`
            : "Importing your connections doesn’t send any messages."}
        </div>
        <div className="ob-seg" style={{ width: 180, flexShrink: 0 }}>
          <button type="button" className={mode === "me" ? "on" : ""} onClick={() => setMode("me")}>
            Myself
          </button>
          <button
            type="button"
            className={mode === "claude" ? "on" : ""}
            onClick={() => setMode("claude")}
          >
            Browser task
          </button>
        </div>
      </div>

      {mode === "me" ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
          <span style={{ flex: 1, color: "var(--ink-2)" }}>
            Request your connections export from LinkedIn. When it’s ready, download it and import
            it here.
          </span>
          <button
            type="button"
            className="native-secondary"
            style={{ height: 32, fontSize: 12.5, whiteSpace: "nowrap" }}
            onClick={() => {
              void api().openExternal(LI_PAGE);
            }}
          >
            Open LinkedIn's page
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
          <span style={{ flex: 1, color: "var(--ink-2)" }}>
            Start a browser task to help request your export using your selected provider.
          </span>
          <button
            type="button"
            className="native-secondary"
            style={{ height: 32, fontSize: 12.5, whiteSpace: "nowrap" }}
            onClick={() => {
              go({
                kind: "agent",
                task: LI_TASK,
                url: LI_PAGE,
                title: "Request your LinkedIn export",
                back: { kind: "network" },
              });
            }}
          >
            Start browser task
          </button>
        </div>
      )}

      <button
        type="button"
        className={`drop ${drag ? "over" : ""}`}
        onClick={() => pick.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          void use(e.dataTransfer.files[0]);
        }}
        disabled={busy}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />
        </svg>
        {busy ? (
          "Reading your export…"
        ) : (
          <span>
            <b>{connected ? "Drop a newer export here" : "Drop a LinkedIn ZIP or CSV here"}</b> or
            browse
          </span>
        )}
      </button>
      <input
        ref={pick}
        type="file"
        accept=".zip,.csv"
        hidden
        onChange={(e) => void use(e.target.files?.[0])}
      />
      {err && <p className="error">{err}</p>}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 12,
          color: "var(--muted)",
        }}
      >
        <span style={{ color: "#1f8a43" }}>🔒</span>
        Your export is read on this Mac. Company names from your connections may be sent to your
        selected provider to assess fit.
        {connected &&
          (sure ? (
            <div className="native-delete-confirm">
              <p>
                Remove imported connections and network matches from IcpFinder across all
                businesses?
              </p>
              <button type="button" className="secondary btn" onClick={() => setSure(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="ghost btn"
                style={{ marginLeft: "auto", color: "var(--red)", fontSize: 12 }}
                onClick={() =>
                  void api()
                    .deleteNetwork()
                    .then(onState)
                    .catch((e) => setErr(cleanError(e)))
                }
              >
                Remove connections
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="ghost btn"
              style={{ marginLeft: "auto", fontSize: 12 }}
              onClick={() => setSure(true)}
            >
              Delete my network
            </button>
          ))}
      </div>
      <details style={{ fontSize: 12, color: "var(--muted)" }}>
        <summary>Why an export and not one click?</summary>
        <div style={{ marginTop: 4 }}>
          Import a downloaded export to choose which connection data you share with IcpFinder.
        </div>
      </details>
    </section>
  );
};
