import { useState } from "react";
import type { State } from "../../shared/types";
import type { View } from "./App";
import { ConnectorsView } from "./Connectors";
import { SubscriptionPanel } from "./SubscriptionPanel";
import { UsageView } from "./Usage";
export function SettingsView({
  state,
  onState,
  go,
}: {
  state: State;
  onState: (s: State) => void;
  go: (v: View) => void;
}) {
  const [tab, setTab] = useState("Provider");
  return (
    <div className="native-settings">
      <header>
        <h1>Settings</h1>
        <p>Manage the services IcpFinder uses.</p>
        <nav className="native-settings-tabs" aria-label="Settings section">
          {["Provider", "Connected services", "Usage"].map((t) => (
            <button
              className={`btn ${tab === t ? "selected" : ""}`}
              type="button"
              key={t}
              aria-pressed={tab === t}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </nav>
      </header>
      {tab === "Provider" ? (
        <div className="native-settings-body scroll">
          <SubscriptionPanel state={state} onState={onState} />
        </div>
      ) : tab === "Usage" ? (
        <UsageView state={state} />
      ) : (
        <ConnectorsView
          state={state}
          onState={onState}
          onNetwork={() => go({ kind: "network" })}
          servicesOnly
        />
      )}
    </div>
  );
}
