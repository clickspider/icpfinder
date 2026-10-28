import { useState } from "react";
import { SITES, type Site, type SiteStatus } from "../../shared/listen";
import type { State } from "../../shared/types";
import { api, Spinner, ToolLogo } from "./ui";

const NAME: Record<Site, string> = { reddit: "Reddit", x: "X", linkedin: "LinkedIn" };
const LOGO: Record<Site, string> = { reddit: "reddit", x: "x", linkedin: "linkedin" };
const STATUS: Record<SiteStatus, { label: string; tone: "ok" | "warn" | "bad" | "quiet" }> = {
  ok: { label: "Ready", tone: "ok" },
  ask: { label: "Needs your OK", tone: "warn" },
  blocked: { label: "Blocked by a browser setting", tone: "bad" },
  unsupported: { label: "Claude in Chrome does not read this site", tone: "bad" },
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
  const claude = (state.settings.provider ?? "claude") === "claude";
  const mode = state.settings.sources.browser === "app" || !claude ? "app" : "yours";
  const st = state.settings.browserStatus?.mode === mode ? state.settings.browserStatus : undefined;
  const check = () => {
    setBusy("check");
    void api()
      .browserCheck()
      .then(onState)
      .finally(() => setBusy(null));
  };
  const ask = (site: Site | "connect") => {
    setBusy(site);
    void api()
      .browserAsk(site)
      .then(() => api().browserCheck())
      .then(onState)
      .finally(() => setBusy(null));
  };
  const pick = (browser: "yours" | "app") =>
    void api()
      .saveSettings({ sources: { ...state.settings.sources, browser } })
      .then(onState);
  const ready = st && (Object.keys(SITES) as Site[]).every((s) => st.sites[s] === "ok");

  return (
    <section className={`panel browser-panel ${compact ? "compact" : ""}`} aria-label="Browser">
      <div className="browser-head">
        <div>
          <h3>Browser</h3>
          <p>
            {mode === "yours"
              ? "Your own Chrome or Comet, through Claude in Chrome, where you are already signed in. It opens a tab, reads it and closes it. It never posts."
              : "IcpFinder’s own browser. Sign in to each site once inside it."}
          </p>
        </div>
        <span className={`browser-state ${ready ? "ok" : st ? "warn" : "quiet"}`}>
          {ready ? "All set" : st ? "Needs attention" : "Not checked"}
        </span>
      </div>
      {!compact && (
        <div className="ob-seg browser-pick" role="radiogroup" aria-label="Which browser">
          <button
            type="button"
            role="radio"
            aria-checked={mode === "yours"}
            className={mode === "yours" ? "on" : ""}
            disabled={!claude}
            title={
              !claude ? "Choose Claude in AI subscriptions to use your own browser" : undefined
            }
            onClick={() => pick("yours")}
          >
            <ToolLogo name="claude" size={13} radius={3} /> Your browser
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
      {mode === "yours" && st && !st.connected && (
        <div className="browser-steps">
          <p className="browser-note bad">
            {st.needsConnect
              ? "Claude in Chrome asks for your OK before every new task, and IcpFinder works in the background, so it cannot show you that question. Allow it once in the extension:"
              : "Claude in Chrome did not answer. Check that the Claude extension is installed and signed in in your browser, then:"}
          </p>
          <ol>
            <li>In Comet or Chrome, open the Claude extension’s side panel.</li>
            <li>Open its menu, then Extension settings.</li>
            <li>
              Under permissions, add reddit.com, x.com and linkedin.com to your approved sites, or
              let it act without asking.
            </li>
            <li>Come back here and press Check again.</li>
          </ol>
        </div>
      )}
      {(Object.keys(SITES) as Site[]).map((site) => {
        const s = st?.sites[site] ?? "unknown";
        return (
          <div key={site} className="browser-site">
            <ToolLogo name={LOGO[site]} size={22} radius={6} />
            <b>{NAME[site]}</b>
            <span className={`browser-pill ${STATUS[s].tone}`}>{STATUS[s].label}</span>
            {(s === "ask" || s === "signed-out") && (
              <button
                type="button"
                className="btn native-secondary"
                disabled={busy !== null}
                onClick={() => ask(site)}
              >
                {busy === site ? <Spinner /> : null}
                {mode === "yours" ? "Ask for access" : "Sign in"}
              </button>
            )}
          </div>
        );
      })}
      {busy && busy !== "check" && mode === "yours" && (
        <p className="browser-note">
          Look at your browser now: if the Claude extension asks for permission, choose “Always
          allow” for {NAME[busy as Site]}.
        </p>
      )}
      {st && Object.values(st.sites).includes("unsupported") && (
        <p className="browser-note">
          Anthropic does not let Claude in Chrome read some sites, Reddit among them. IcpFinder
          still listens on the other sites you picked.
        </p>
      )}
      {st && Object.values(st.sites).includes("blocked") && (
        <p className="browser-note bad">
          A browser setting blocks the extension on this site. In Comet or Chrome, open the Claude
          extension’s site access and allow it, or ask your admin if a work policy blocks it.
        </p>
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
          <small>
            Checked {new Date(st.checkedAt).toLocaleString()}
            {mode === "yours" ? " · a check costs a few cents of AI" : ""}
          </small>
        )}
      </div>
    </section>
  );
}
