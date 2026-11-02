import { useEffect, useState } from "react";
import { SITES, type Site, type SiteStatus } from "../../shared/listen";
import type { State } from "../../shared/types";
import { api, Spinner, ToolLogo } from "./ui";

const NAME: Record<Site, string> = { reddit: "Reddit", x: "X", linkedin: "LinkedIn" };
const LOGO: Record<Site, string> = { reddit: "reddit", x: "x", linkedin: "linkedin" };
const STATUS: Record<SiteStatus, { label: string; tone: "ok" | "warn" | "bad" | "quiet" }> = {
  ok: { label: "Ready", tone: "ok" },
  ask: { label: "Needs your OK", tone: "warn" },
  blocked: { label: "Blocked by a browser setting", tone: "bad" },
  unsupported: { label: "Claude does not open it", tone: "quiet" },
  "signed-out": { label: "Not signed in", tone: "warn" },
  unknown: { label: "Not checked", tone: "quiet" },
};

/** One place for the browser IcpFinder reads Reddit, X and LinkedIn with: pick it, see if it
 *  works, and fix what is missing without leaving the app. */
export function BrowserPanel({
  state,
  onState,
  compact = false,
}: {
  state: State;
  onState: (s: State) => void;
  compact?: boolean;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const mode = state.settings.sources.browser === "app" ? "app" : "yours";
  const st = state.settings.browserStatus?.mode === mode ? state.settings.browserStatus : undefined;
  const connected = mode === "app" || Boolean(st?.connected);
  const check = () => {
    setBusy("check");
    void api()
      .browserCheck()
      .then(onState)
      .finally(() => setBusy(null));
  };
  // Check once when the panel opens and nothing was checked yet. A check uses a little AI, so no polling.
  // biome-ignore lint/correctness/useExhaustiveDependencies: once per browser choice
  useEffect(() => {
    if (!st && !compact) check();
  }, [mode]);
  const ask = (site: Site | "connect") => void api().browserAsk(site);
  const pick = (browser: "yours" | "app") =>
    void api()
      .saveSettings({ sources: { ...state.settings.sources, browser } })
      .then(onState);
  const linkedinOn = state.settings.sources.linkedin;
  const shown = (Object.keys(SITES) as Site[]).filter((s) => s !== "linkedin" || linkedinOn);
  const ready = st && connected && shown.every((s) => st.sites[s] === "ok");

  return (
    <section className={`panel browser-panel ${compact ? "compact" : ""}`} aria-label="Browser">
      <div className="browser-head">
        <div>
          <h3>Browser</h3>
          <p>
            {mode === "yours"
              ? "Your own Chrome or Comet, where you are already signed in, through Claude in Chrome, the extension from Anthropic. Each morning Claude opens a few search pages in a tab, reads the posts and closes the tab. It never clicks or posts."
              : "IcpFinder’s own browser. Sign in to each site once inside it."}
          </p>
        </div>
        <span className={`browser-state tone-${ready ? "ok" : st ? "warn" : "quiet"}`}>
          {ready
            ? "All set"
            : !connected && st
              ? "Not connected"
              : st
                ? "Needs attention"
                : "Not checked"}
        </span>
      </div>
      {!compact && (
        <div className="ob-seg browser-pick" role="radiogroup" aria-label="Which browser">
          <button
            type="button"
            role="radio"
            aria-checked={mode === "yours"}
            className={mode === "yours" ? "on" : ""}
            onClick={() => pick("yours")}
          >
            Your browser
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={mode === "app"}
            className={mode === "app" ? "on" : ""}
            onClick={() => pick("app")}
          >
            IcpFinder’s browser
          </button>
        </div>
      )}
      {mode === "yours" && !connected && (
        <div className="browser-steps">
          <p className="browser-note">
            Set up Claude in Chrome once. After that it runs by itself.
          </p>
          <ol>
            <li>
              <button type="button" className="btn native-secondary" onClick={() => ask("connect")}>
                Get Claude in Chrome
              </button>
            </li>
            <li>Sign in to it with the same Claude account as IcpFinder.</li>
            <li>Keep your browser open, then choose Check again.</li>
          </ol>
        </div>
      )}
      {connected &&
        shown.map((site) => {
          const s = st?.sites[site] ?? "unknown";
          return (
            <div key={site} className="browser-site">
              <ToolLogo name={LOGO[site]} size={22} radius={6} />
              <b>{NAME[site]}</b>
              <span className={`browser-pill tone-${STATUS[s].tone}`}>{STATUS[s].label}</span>
              {s === "signed-out" && (
                <button type="button" className="btn native-secondary" onClick={() => ask(site)}>
                  Sign in
                </button>
              )}
            </div>
          );
        })}
      {!compact && (
        <label className="browser-li">
          <input
            type="checkbox"
            checked={linkedinOn}
            onChange={() =>
              void api()
                .saveSettings({ sources: { ...state.settings.sources, linkedin: !linkedinOn } })
                .then(onState)
            }
          />
          <span>
            Also read LinkedIn
            <small>
              LinkedIn’s terms forbid automated reading, and it can limit accounts that do it. Off
              unless you choose it.
            </small>
          </span>
        </label>
      )}
      <div className="browser-foot">
        <button
          type="button"
          className="btn native-secondary"
          disabled={busy !== null}
          onClick={check}
        >
          {busy === "check" ? <Spinner /> : null} {st ? "Check again" : "Check connection"}
        </button>
        {st && (
          <small>Checked {new Date(st.checkedAt).toLocaleString()} · uses about a cent of AI</small>
        )}
      </div>
    </section>
  );
}
