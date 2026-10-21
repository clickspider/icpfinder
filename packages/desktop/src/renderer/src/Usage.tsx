// SPDX-License-Identifier: MIT

import { useState } from "react";
import type { State } from "../../shared/types";
import { emptyTotals, groupBy, type Provider, tokensOf } from "../../shared/usage";
import { ToolLogo } from "./ui";

const PERIODS = [
  { days: 1, label: "Today" },
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
];
const PROVIDERS: Array<{ id: Provider; label: string }> = [
  { id: "claude", label: "Claude" },
  { id: "codex", label: "ChatGPT" },
  { id: "xai", label: "Grok" },
];

export const UsageView = ({ state }: { state: State }) => {
  const [days, setDays] = useState(7);
  const [provider, setProvider] = useState<Provider>(state.settings.provider ?? "claude");
  const rows = (state.usage ?? []).filter((row) => row.provider === provider);
  // Include setup and archived businesses in the total without presenting them as businesses.
  const total = tokensOf(groupBy(rows, days, () => "all")[0]?.[1] ?? emptyTotals());
  const providerName = PROVIDERS.find((item) => item.id === provider)?.label;

  return (
    <div className="enter scroll native-page native-usage">
      <header className="drag">
        <h1>IcpFinder usage</h1>
        <p>Tokens recorded in IcpFinder, by provider and period.</p>
      </header>
      <div className="nodrag native-usage-filters">
        <div>
          <div className="native-muted">Provider</div>
          <fieldset className="ob-seg" aria-label="Provider">
            {PROVIDERS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={provider === item.id ? "on" : ""}
                aria-pressed={provider === item.id}
                onClick={() => setProvider(item.id)}
              >
                {item.id !== "xai" && <ToolLogo name={item.id} size={13} radius={3} />}
                {item.label}
              </button>
            ))}
          </fieldset>
        </div>
        <div>
          <div className="native-muted">Period</div>
          <fieldset className="ob-seg" aria-label="Period">
            {PERIODS.map((period) => (
              <button
                key={period.days}
                type="button"
                className={days === period.days ? "on" : ""}
                aria-pressed={days === period.days}
                onClick={() => setDays(period.days)}
              >
                {period.label}
              </button>
            ))}
          </fieldset>
        </div>
      </div>
      <section className="native-token-total" aria-live="polite" aria-atomic="true">
        <h2>{providerName} tokens</h2>
        <div className="use-big">{total.toLocaleString()}</div>
        <p>{days === 1 ? "Today" : `Last ${days} days`}</p>
        {total === 0 && <p>No tokens recorded for this period.</p>}
      </section>
      <p className="native-muted">
        Recorded IcpFinder usage only. Your provider may report different totals.
      </p>
    </div>
  );
};
