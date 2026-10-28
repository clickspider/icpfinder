import type { State } from "../../shared/types";
import type { View } from "./App";
import { BrowserPanel } from "./BrowserPanel";
import { ConnectorsView } from "./Connectors";
import { SubscriptionPanel } from "./SubscriptionPanel";
import { UsageView } from "./Usage";
export function SettingsView({
  state,
  onState,
  go,
  tab,
}: {
  state: State;
  onState: (s: State) => void;
  go: (v: View) => void;
  tab: "Provider" | "Browser" | "Connected services" | "Usage";
}) {
  return (
    <div className="native-settings">
      <header>
        <h1>Settings</h1>
        <p>Manage the services IcpFinder uses.</p>
        <nav className="native-settings-tabs" aria-label="Settings section">
          {(["Provider", "Browser", "Connected services", "Usage"] as const).map((t) => (
            <button
              className={`btn ${tab === t ? "selected" : ""}`}
              type="button"
              key={t}
              aria-pressed={tab === t}
              onClick={() => go({ kind: "settings", tab: t })}
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
      ) : tab === "Browser" ? (
        <div className="native-settings-body scroll">
          <BrowserPanel state={state} onState={onState} />
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
