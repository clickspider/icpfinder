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
  const [open, setOpen] = useState<"linkedin" | "instagram" | null>(
    state.contacts.length ? null : "linkedin"
  );
  const companies = ws.icps
    .flatMap((i) => i.companies)
    .filter((c) => (c.match ?? 0) >= scoringOf(ws.scoring).bar && c.approval !== "rejected");
  const warm = companies.filter((c) => (c.warm?.length ?? 0) > 0);
  const li = state.network?.linkedin;
  const connected = state.contacts.length > 0;

  return (
    <div
      className="enter scroll"
      style={{ flex: 1, display: "flex", flexDirection: "column", padding: 16, gap: 16 }}
    >
      <header className="drag" style={{ padding: "8px 4px 0" }}>
        <h1 className="ob-h1">
          Find your <em>way in</em>
        </h1>
        <p className="ob-sub" style={{ marginTop: 4 }}>
          An intro beats a cold email. Add where your people are.
        </p>
      </header>

      <section className="panel" style={{ padding: 18 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span
            style={{ fontSize: 34, fontWeight: 800, color: "#1f8a43", letterSpacing: "-0.02em" }}
          >
            {warm.length}
          </span>
          <span style={{ fontSize: 15, color: "var(--muted)" }}>of {companies.length}</span>
          <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--faint)" }}>
            grey = nobody you know yet
          </span>
        </div>
        <div style={{ fontWeight: 600, marginTop: 2 }}>companies where you know someone</div>
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
              Hunt an ICP first. Then this shows who you know there.
            </div>
          )}
        </div>
      </section>

      <div style={{ display: "flex", alignItems: "center" }}>
        <div className="lbl">Your sources</div>
        <div style={{ marginLeft: "auto", fontSize: 12, color: "var(--faint)" }}>
          {connected ? 1 : 0} of 2 connected
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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
          <div className="net-sub">Your whole network, matched to every company you hunt.</div>
          <div className="net-state" style={{ color: connected ? "#1f8a43" : "var(--ink-2)" }}>
            {connected
              ? `${state.contacts.length.toLocaleString()} connections · a way in at ${warm.length}`
              : li?.requestedAt
                ? `Requested ${day(li.requestedAt)}. Drop the file when it arrives`
                : "Not added yet"}
            <span className="net-chev">{open === "linkedin" ? "⌃" : "⌄"}</span>
          </div>
        </button>
        <button
          type="button"
          className={`btn net-card ${open === "instagram" ? "on" : ""}`}
          onClick={() => setOpen(open === "instagram" ? null : "instagram")}
        >
          <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
            <ToolLogo name="instagram" size={40} radius={10} />
          </div>
          <div className="net-title">Instagram</div>
          <div className="net-sub">
            Shows who you are really close to, so their intros rank first.
          </div>
          <div className="net-state" style={{ color: "var(--faint)" }}>
            Soon
            <span className="net-chev">{open === "instagram" ? "⌃" : "⌄"}</span>
          </div>
        </button>
      </div>

      {open === "linkedin" && (
        <LinkedInPanel state={state} onState={onState} go={go} connected={connected} />
      )}
      {open === "instagram" && (
        <section
          className="panel rise"
          style={{ padding: 16, fontSize: 13, color: "var(--ink-2)" }}
        >
          Instagram comes next. It will only rank people you already know higher, and never add
          anyone.
        </section>
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
            ? `Added ${day(li?.importedAt)}. People change jobs, so a fresh export now and then keeps your paths right.`
            : "We match your connections to every company you hunt. We never message anyone."}
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
            <ToolLogo name="claude" size={13} radius={3} /> Claude
          </button>
        </div>
      </div>

      {mode === "me" ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
          <span style={{ flex: 1, color: "var(--ink-2)" }}>
            On LinkedIn pick <b>Download larger data archive</b>, then <b>Request archive</b>. It
            comes by email within a day.
          </span>
          <button
            type="button"
            className="ob-cta"
            style={{ height: 32, fontSize: 12.5, whiteSpace: "nowrap" }}
            onClick={() => {
              void api().openExternal(LI_PAGE);
              void api().networkRequested().then(onState);
            }}
          >
            Open LinkedIn's page
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
          <span style={{ flex: 1, color: "var(--ink-2)" }}>
            Claude opens LinkedIn in IcpFinder's browser and requests the export. You watch, and it
            asks you before it clicks.
          </span>
          <button
            type="button"
            className="ob-cta"
            style={{ height: 32, fontSize: 12.5, whiteSpace: "nowrap" }}
            onClick={() => {
              void api().networkRequested().then(onState);
              go({
                kind: "agent",
                task: LI_TASK,
                url: LI_PAGE,
                title: "Request your LinkedIn export",
                back: { kind: "network" },
              });
            }}
          >
            Let Claude do it
          </button>
        </div>
      )}

      {li?.requestedAt && !connected && (
        <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
          <b style={{ color: "var(--ink-2)" }}>Requested {day(li.requestedAt)}.</b> Check your email
          for LinkedIn's file.
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
            <b>{connected ? "Drop a newer export here" : "Drop the ZIP here when it arrives"}</b> or
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
        Read on your Mac, never uploaded. Only used for warm paths.
        {connected &&
          (sure ? (
            <button
              type="button"
              className="ghost btn"
              style={{ marginLeft: "auto", color: "var(--red)", fontSize: 12 }}
              onClick={() => void api().deleteNetwork().then(onState)}
            >
              Yes, delete {state.contacts.length.toLocaleString()} contacts
            </button>
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
          LinkedIn has no free way for apps to read your connections. Your own export is the
          official route.
        </div>
      </details>
    </section>
  );
};
