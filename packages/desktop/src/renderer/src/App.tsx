// SPDX-License-Identifier: MIT
//
// Root: the setup wizard blocks until the workspace (product + ICPs) exists.
// After that: ICP launcher sidebar + a main screen in the chosen ICP's context.

import { useEffect, useState } from "react";
import type { State } from "../../shared/types";
import { AgentMini, AgentView } from "./AgentView";
import { CompanyView } from "./CompanyView";
import { ConnectorsView } from "./Connectors";
import { IcpView } from "./IcpView";
import { MatchingView } from "./Matching";
import { NetworkView } from "./Network";
import { Overview } from "./Overview";
import { ProductView } from "./ProductView";
import { SettingsView } from "./SettingsView";
import "./native-workspace.css";
import { Sidebar } from "./Sidebar";
import { UsageView } from "./Usage";
import { api, cleanError } from "./ui";
import { Wizard } from "./Wizard";

export type View =
  | { kind: "overview" }
  | { kind: "settings" }
  | { kind: "icp"; icpId: string }
  | { kind: "company"; icpId: string; domain: string }
  | { kind: "product" }
  | { kind: "connectors" }
  | { kind: "network" }
  | { kind: "matching"; back?: View }
  | { kind: "usage" }
  | { kind: "agent"; task?: string; url?: string; title: string; back: View };

export const App = () => {
  const [state, setState] = useState<State | null>(null);
  const [view, setView] = useState<View | null>(null);

  const [toast, setToast] = useState<string | null>(null);
  // The live agent's screen title, so the mini window reopens the same session.
  const [agentTitle, setAgentTitle] = useState("Claude in your browser");
  useEffect(() => {
    if (view?.kind === "agent") setAgentTitle(view.title);
  }, [view]);

  useEffect(() => {
    void api().getState().then(setState);
    return api().onState(setState);
  }, []);

  // A notification was clicked: open what it was about.
  useEffect(
    () =>
      api().onNavigate((t) => {
        if (t.kind === "company" && t.icpId && t.domain)
          setView({ kind: "company", icpId: t.icpId, domain: t.domain });
        else if (t.kind === "icp" && t.icpId) setView({ kind: "icp", icpId: t.icpId });
        else if (t.kind === "agent")
          setView((v) => ({
            kind: "agent",
            title: "AI in your browser",
            back: v ?? { kind: "product" },
          }));
      }),
    []
  );

  // Any call that fails and nobody handled shows here, short, instead of failing silently.
  useEffect(() => {
    const on = (e: PromiseRejectionEvent) => {
      e.preventDefault();
      setToast(cleanError(e.reason));
    };
    window.addEventListener("unhandledrejection", on);
    return () => window.removeEventListener("unhandledrejection", on);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 7000);
    return () => clearTimeout(t);
  }, [toast]);
  const toastEl = toast && (
    <div className="toast glass pop" role="alert">
      <span style={{ color: "#e0244a", fontWeight: 700 }}>⚠</span>
      <span style={{ flex: 1 }}>{toast}</span>
      <button
        type="button"
        className="ghost btn"
        aria-label="Dismiss"
        onClick={() => setToast(null)}
      >
        ✕
      </button>
    </div>
  );

  if (!state) return null;
  const ws = state.workspaces.find((w) => w.id === state.activeId);
  if (!ws?.setupDone)
    return (
      <>
        <Wizard state={state} onState={setState} />
        {toastEl}
      </>
    );

  const current: View | null =
    view &&
    (view.kind === "overview" ||
      view.kind === "settings" ||
      view.kind === "product" ||
      view.kind === "connectors" ||
      view.kind === "network" ||
      view.kind === "matching" ||
      view.kind === "usage" ||
      view.kind === "agent" ||
      ws.icps.some((i) => i.id === view.icpId))
      ? view
      : { kind: "overview" };

  return (
    <div className="shell native-workspace">
      <Sidebar state={state} ws={ws} view={current} go={setView} onState={setState} />
      <main className="main">
        {current?.kind === "overview" && (
          <Overview key={ws.id} ws={ws} go={setView} onState={setState} />
        )}
        {current?.kind === "settings" && (
          <SettingsView state={state} onState={setState} go={setView} />
        )}
        {current?.kind === "icp" && (
          <IcpView
            key={current.icpId}
            ws={ws}
            icpId={current.icpId}
            contacts={state.contacts}
            facts={state.companyFacts ?? {}}
            timing={state.settings.timing ?? { searchMs: 150_000, checkMs: 45_000 }}
            go={setView}
            onState={setState}
          />
        )}
        {current?.kind === "company" && (
          <CompanyView
            key={current.domain}
            ws={ws}
            icpId={current.icpId}
            domain={current.domain}
            go={setView}
            onState={setState}
          />
        )}
        {current?.kind === "product" && <ProductView key={ws.id} ws={ws} onState={setState} />}
        {current?.kind === "connectors" && (
          <ConnectorsView
            state={state}
            onState={setState}
            onNetwork={() => setView({ kind: "network" })}
          />
        )}
        {current?.kind === "matching" && (
          <MatchingView
            key={ws.id}
            ws={ws}
            onState={setState}
            onBack={() =>
              setView(
                current.back ??
                  (firstIcp ? { kind: "icp", icpId: firstIcp.id } : { kind: "product" })
              )
            }
          />
        )}
        {current?.kind === "usage" && <UsageView state={state} />}
        {current?.kind === "network" && (
          <NetworkView state={state} ws={ws} onState={setState} go={setView} />
        )}
        {current?.kind === "agent" && (
          <AgentView
            key={current.title}
            task={current.task}
            startUrl={current.url}
            title={current.title}
            onClose={() => setView(current.back)}
          />
        )}
      </main>
      {current?.kind !== "agent" && (
        <AgentMini
          onOpen={() =>
            setView({ kind: "agent", title: agentTitle, back: current ?? { kind: "product" } })
          }
        />
      )}
      {toastEl}
    </div>
  );
};
