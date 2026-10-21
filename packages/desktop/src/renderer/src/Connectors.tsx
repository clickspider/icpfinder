// SPDX-License-Identifier: MIT
//
// Connectors: the services IcpFinder plugs into, with their real logos and a
// live status. Used in the setup wizard and as a page in the app.

import { useEffect, useState } from "react";
import type { State } from "../../shared/types";
import { SubscriptionPanel } from "./SubscriptionPanel";
import { api, Spinner, TOOL_LOGOS, ToolLogo } from "./ui";

type Hunter = Awaited<ReturnType<ReturnType<typeof api>["verifyHunter"]>>;

const Logo = ({ src, name, bg }: { src?: string; name: string; bg: string }) =>
  src ? (
    <img
      src={src}
      alt=""
      width={40}
      height={40}
      style={{
        width: 40,
        height: 40,
        borderRadius: 11,
        objectFit: "contain",
        background: "#fff",
        boxShadow: "0 0 0 0.5px rgba(0,0,0,0.12)",
        flexShrink: 0,
      }}
    />
  ) : (
    <div
      aria-hidden="true"
      style={{
        width: 40,
        height: 40,
        borderRadius: 11,
        background: bg,
        color: "#fff",
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {name[0]}
    </div>
  );

const Status = ({ kind, text }: { kind: "on" | "off" | "soon" | "busy"; text: string }) => (
  <span
    className={`pill ${kind === "on" ? "p-green" : kind === "soon" ? "p-gray" : kind === "busy" ? "p-gray" : "p-amber"}`}
  >
    {kind === "on" && <span aria-hidden="true">●</span>}
    {text}
  </span>
);

const Card = ({ children }: { children: React.ReactNode }) => (
  <div
    className="rise"
    style={{
      display: "flex",
      flexDirection: "column",
      gap: 10,
      padding: 14,
      borderRadius: 14,
      background: "#fff",
      boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,0.12)",
    }}
  >
    {children}
  </div>
);

export const Connectors = ({
  state,
  onState,
  compact = false,
}: {
  state: State;
  onState: (s: State) => void;
  compact?: boolean;
}) => {
  const icons = TOOL_LOGOS;
  const [key, setKey] = useState(state.settings.hunterKey);
  const [hunter, setHunter] = useState<Hunter | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (state.settings.hunterKey) void api().verifyHunter(state.settings.hunterKey).then(setHunter);
  }, [state.settings.hunterKey]);

  const connect = async () => {
    setChecking(true);
    const res = await api().verifyHunter(key);
    setHunter(res);
    if (res.ok) onState(await api().saveSettings({ hunterKey: key.trim() }));
    setChecking(false);
  };
  const disconnect = async () => {
    setKey("");
    setHunter(null);
    onState(await api().saveSettings({ hunterKey: "" }));
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: compact ? "1fr" : "repeat(2, minmax(0, 1fr))",
        gap: 10,
      }}
    >
      <div style={{ gridColumn: "1 / -1" }}>
        <SubscriptionPanel state={state} onState={onState} />
      </div>
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Logo src={icons.hunter} name="Hunter" bg="#ff5722" />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>Hunter.io</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              {hunter?.ok
                ? `${hunter.email ?? "Connected"}${hunter.plan ? ` · ${hunter.plan}` : ""}${hunter.searchesLeft !== undefined ? ` · ${hunter.searchesLeft} searches left` : ""}`
                : "Finds work emails"}
            </div>
          </div>
          {checking ? (
            <Spinner />
          ) : (
            <Status
              kind={hunter?.ok ? "on" : "off"}
              text={hunter?.ok ? "Connected" : "Not connected"}
            />
          )}
        </div>
        {hunter?.ok ? (
          <button
            type="button"
            className="btn"
            style={{
              alignSelf: "flex-start",
              background: "transparent",
              color: "var(--muted)",
              fontSize: 13,
              padding: 0,
            }}
            onClick={() => void disconnect()}
          >
            Disconnect
          </button>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <label htmlFor="hunter-key" style={{ position: "absolute", left: -9999 }}>
              Hunter API key
            </label>
            <input
              id="hunter-key"
              className="field"
              type="password"
              placeholder="Paste your Hunter API key"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              style={{ height: 38, fontSize: 13 }}
            />
            <button
              type="button"
              className="secondary btn"
              style={{ height: 38, background: "#111114", color: "#fff" }}
              disabled={!key.trim() || checking}
              onClick={() => void connect()}
            >
              Connect
            </button>
          </div>
        )}
        {hunter && !hunter.ok && hunter.error !== "No key" && (
          <div className="error">{hunter.error}</div>
        )}
      </Card>
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Logo src={icons.gmail} name="Gmail" bg="#ea4335" />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>Gmail</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>Via Claude · drafts only</div>
          </div>
          <Status kind="off" text="Requires Claude Gmail connector" />
        </div>
      </Card>
    </div>
  );
};

const SOURCES: Array<{
  key: "hn" | "reddit" | "x" | "linkedin";
  name: string;
  how: string;
  login?: string;
}> = [
  { key: "hn", name: "Hacker News", how: "Open API. Launches and Show HN posts." },
  {
    key: "reddit",
    name: "Reddit",
    how: "Read in your browser. Founders asking for help.",
    login: "https://www.reddit.com/login/",
  },
  {
    key: "x",
    name: "X",
    how: "Read in your browser with your login. Live posts.",
    login: "https://x.com/login",
  },
  {
    key: "linkedin",
    name: "LinkedIn posts",
    how: "Read in your browser with your login.",
    login: "https://www.linkedin.com/login",
  },
];

/** Where hunts look for fresh buying signals, beyond Claude's web search. */
const SignalSources = ({ state, onState }: { state: State; onState: (s: State) => void }) => {
  const src = state.settings.sources;
  const save = (patch: Partial<typeof src>) =>
    void api()
      .saveSettings({ sources: { ...src, ...patch } })
      .then(onState);
  return (
    <div
      className="panel"
      style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}
    >
      <div style={{ display: "flex", alignItems: "baseline" }}>
        <div className="lbl">Where we look for signals</div>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--muted)" }}>
          plus your AI provider’s web search
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 12.5, color: "var(--ink-2)", flex: 1 }}>
          Read social sites with
        </span>
        <div className="ob-seg" style={{ width: 300 }}>
          <button
            type="button"
            className={src.browser !== "yours" ? "on" : ""}
            onClick={() => save({ browser: "app" })}
          >
            IcpFinder's browser
          </button>
          <button
            type="button"
            className={src.browser === "yours" ? "on" : ""}
            onClick={() => save({ browser: "yours" })}
          >
            <ToolLogo name="claude" size={13} radius={3} /> Your browser
          </button>
        </div>
      </div>
      {src.browser === "yours" && (
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: -4 }}>
          Your own browser through Claude in Chrome, where you are already signed in. Claude opens a
          tab, reads it and closes it.
        </div>
      )}
      {SOURCES.map((s) => (
        <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <ToolLogo name={s.key} size={30} radius={8} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 13.5 }}>{s.name}</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>{s.how}</div>
          </div>
          {s.login && src.browser !== "yours" && (
            <button
              type="button"
              className="ghost btn"
              style={{ fontSize: 12 }}
              onClick={() => void api().openLogin(s.login ?? "")}
            >
              Sign in
            </button>
          )}
          <button
            type="button"
            role="switch"
            aria-checked={src[s.key]}
            aria-label={s.name}
            className={`switch ${src[s.key] ? "on" : ""}`}
            onClick={() => save({ [s.key]: !src[s.key] })}
          />
        </div>
      ))}
      <div style={{ height: 0.5, background: "rgba(0,0,0,0.08)" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ width: 30, textAlign: "center", fontSize: 18 }} aria-hidden="true">
          🛡️
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 13.5 }}>Blocked pages</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            When a site blocks AI, read it in your browser to prove facts.
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={src.fallback}
          aria-label="Blocked pages"
          className={`switch ${src.fallback ? "on" : ""}`}
          onClick={() => save({ fallback: !src.fallback })}
        />
      </div>
      <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
        ⚠ Your own login, read only, one page at a time. Sites can still limit accounts that browse
        by script, so Reddit, X and LinkedIn are off until you switch them on.
      </div>
    </div>
  );
};

export const ConnectorsView = ({
  state,
  onState,
  onNetwork,
}: {
  state: State;
  onState: (s: State) => void;
  onNetwork: () => void;
}) => (
  <div
    className="enter scroll"
    style={{ flex: 1, padding: "28px 32px", display: "flex", flexDirection: "column", gap: 18 }}
  >
    <div className="drag" style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
      <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em" }}>
        Connectors
      </h1>
      <div style={{ color: "var(--muted)" }}>The services IcpFinder uses for you</div>
    </div>
    <Connectors state={state} onState={onState} />
    <button
      type="button"
      className="btn panel"
      style={{ padding: 16, display: "flex", alignItems: "center", gap: 12, textAlign: "left" }}
      onClick={onNetwork}
    >
      <ToolLogo name="linkedin" size={40} radius={10} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600 }}>Your network</div>
        <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
          {state.contacts.length
            ? `${state.contacts.length.toLocaleString()} LinkedIn connections · intros and people who fit your ICPs`
            : "Add your LinkedIn export to find intros and people who fit your ICPs"}
        </div>
      </div>
      <span className="pill p-green">{state.contacts.length ? "Added" : "Add"}</span>
    </button>
    <SignalSources state={state} onState={onState} />
    <div
      className="panel"
      style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10 }}
    >
      <div className="lbl">Rules</div>
      <div style={{ display: "flex", gap: 10 }}>
        <div className="ok">✓</div>A fact needs 2 websites
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <div className="ok">✓</div>Why now = the last {state.settings.windowDays} days
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <div className="ok">✓</div>Nothing is sent. You copy or draft each email yourself
      </div>
    </div>
  </div>
);
