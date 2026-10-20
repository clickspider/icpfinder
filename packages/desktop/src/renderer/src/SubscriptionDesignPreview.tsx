import { useState } from "react";
import type { ProviderId } from "../../shared/subscriptions";
import { Glass, Marble } from "./glass";
import { ProviderMark } from "./ProviderMark";
import { Mark } from "./ui";
import "./subscription-preview.css";

const PROVIDERS: Array<{ id: ProviderId; name: string }> = [
  { id: "claude", name: "Claude" },
  { id: "codex", name: "ChatGPT" },
  { id: "xai", name: "Grok" },
];
const STATES = [
  { id: "known", title: "Known account" },
  { id: "empty", title: "No default" },
  { id: "selected", title: "Provider selected" },
  { id: "checking", title: "Checking accounts" },
  { id: "browser", title: "Browser sign-in" },
  { id: "device", title: "Device code" },
  { id: "success", title: "Connected" },
  { id: "cancelled", title: "Cancelled" },
  { id: "error", title: "Sign-in error" },
  { id: "expired", title: "Session expired" },
  { id: "missing", title: "Setup needed" },
  { id: "unavailable", title: "Status unavailable" },
] as const;
type PreviewState = (typeof STATES)[number]["id"];

/** Local state gallery. All actions are simulated; no auth, browser or AI APIs are called. */
export function SubscriptionDesignPreview({ onExit }: { onExit: () => void }) {
  const [screen, setScreen] = useState<PreviewState>("known");
  const [notice, setNotice] = useState("");
  const [provider, setProvider] = useState<ProviderId>("codex");
  const name = PROVIDERS.find((item) => item.id === provider)?.name ?? "ChatGPT";
  const known = screen === "known";
  const chooser = screen === "empty" || screen === "selected";
  const go = (next: PreviewState) => {
    setScreen(next);
    setProvider(next === "device" ? "xai" : next === "missing" ? "claude" : "codex");
  };
  const begin = () => setScreen(provider === "xai" ? "device" : "browser");
  const primary = (label: string, action: () => void, disabled = false) => (
    <button type="button" className="sp-continue" disabled={disabled} onClick={action}>
      {label}
      <span aria-hidden="true">↗</span>
    </button>
  );
  const secondary = (label: string, action: () => void) => (
    <button type="button" className="sp-link" onClick={action}>
      {label}
    </button>
  );
  const alternatives = (
    <fieldset className="sp-provider-tiles" aria-label="Choose your provider">
      {PROVIDERS.filter((item) => !known || item.id !== provider).map((item) => (
        <button
          type="button"
          key={item.id}
          aria-pressed={screen === "selected" && item.id === provider}
          className={screen === "selected" && item.id === provider ? "is-picked" : ""}
          onClick={() => {
            setProvider(item.id);
            setScreen("selected");
          }}
        >
          <ProviderMark provider={item.id} size={34} />
          <strong>{item.name}</strong>
          <span>Connect</span>
          {screen === "selected" && item.id === provider && <i aria-hidden="true">✓</i>}
        </button>
      ))}
    </fieldset>
  );
  const account = (
    <div className="sp-account">
      <ProviderMark provider={provider} size={40} />
      <div>
        <strong>{name}</strong>
        <span>Already signed in on this Mac</span>
      </div>
      <span className="sp-ready" role="img" aria-label="Ready">
        ✓
      </span>
    </div>
  );
  const details: Record<
    Exclude<PreviewState, "known" | "empty" | "selected">,
    { title: string; text: string }
  > = {
    checking: {
      title: "Checking your accounts…",
      text: "Looking for an existing sign-in on this Mac.",
    },
    browser: {
      title: `Finish signing in to ${name}`,
      text: "Continue in your browser. We’ll bring you back here when you’re connected.",
    },
    device: {
      title: "Connect your Grok account",
      text: "Enter this code on the sign-in page in your browser.",
    },
    success: { title: "You’re connected.", text: `${name} is ready to help you find your buyers.` },
    cancelled: {
      title: "Sign-in cancelled",
      text: "Your product is still here. Try again whenever you’re ready.",
    },
    error: {
      title: "We couldn’t connect",
      text: `The connection to ${name} failed. Please try signing in again.`,
    },
    expired: {
      title: "Let’s reconnect",
      text: `Your ${name} session has expired. Sign in again to pick up where you left off.`,
    },
    missing: {
      title: "Let’s restore your connection",
      text: "The bundled Claude runtime is missing. Reinstall IcpFinder to restore it.",
    },
    unavailable: {
      title: "Couldn’t check your accounts",
      text: "We couldn’t read the sign-in status on this Mac. Try checking again.",
    },
  };
  const statusCard =
    !known && !chooser ? (
      <div
        className="sp-status-card"
        role={screen === "error" || screen === "unavailable" ? "alert" : "status"}
      >
        {screen === "checking" ? (
          <span className="sp-status-spinner" aria-hidden="true" />
        ) : screen === "success" ? (
          <span className="sp-confirmed">✓</span>
        ) : (
          <ProviderMark provider={provider} size={40} />
        )}
        <h2>{details[screen as keyof typeof details].title}</h2>
        <p>{details[screen as keyof typeof details].text}</p>
        {screen === "device" && <div className="sp-device-code">ABCD-EFGH</div>}
        {(screen === "browser" || screen === "device") && (
          <>
            {primary("Open sign-in page", () =>
              setNotice("Preview only: the sign-in page would open in your browser.")
            )}
            <p className="sp-waiting">Waiting for you to finish signing in…</p>
            {secondary("Cancel sign-in", () => setScreen("cancelled"))}
          </>
        )}
        {screen === "success" &&
          primary("Continue to my product", () =>
            setNotice("Preview only: your product research would begin now.")
          )}
        {(screen === "cancelled" || screen === "error" || screen === "expired") && (
          <>
            {primary(screen === "expired" ? `Reconnect ${name}` : "Try signing in again", begin)}
            {secondary("Choose another provider", () => go("empty"))}
          </>
        )}
        {screen === "missing" && (
          <>
            {primary("Restore IcpFinder", () =>
              setNotice("Preview only: app recovery instructions would open.")
            )}
            {secondary("Check again", () => go("checking"))}
            {secondary("Choose another provider", () => go("empty"))}
          </>
        )}
        {screen === "unavailable" && (
          <>
            {primary("Check again", () => go("checking"))}
            {secondary("Choose a provider", () => go("empty"))}
          </>
        )}
      </div>
    ) : null;

  return (
    <div className="sp-preview">
      <header className="sp-toolbar sp-state-toolbar drag">
        <span className="sp-preview-label">State preview</span>
        <div className="sp-tabs" aria-label="Connection states" role="tablist">
          {STATES.map((item) => (
            <button
              type="button"
              role="tab"
              id={`tab-${item.id}`}
              aria-controls="connection-state"
              key={item.id}
              aria-selected={screen === item.id}
              className={screen === item.id ? "is-active" : ""}
              onClick={() => {
                go(item.id);
                setNotice("");
              }}
            >
              {item.title}
            </button>
          ))}
        </div>
        <button type="button" className="sp-exit" onClick={onExit}>
          Back to app
        </button>
      </header>
      <main
        id="connection-state"
        role="tabpanel"
        aria-labelledby={`tab-${screen}`}
        className={`sp-canvas sp-${known ? "recommended" : "choice"}`}
      >
        <section className="sp-sidebar">
          <div className="sp-brand">
            <Mark size={28} radius={9} />
            <span>IcpFinder</span>
          </div>
          <div className="sp-sidebar-body">
            <span className="sp-eyebrow">LET’S GET TO KNOW YOUR PRODUCT</span>
            <h1>
              Bring the AI
              <br />
              <em>you already use.</em>
            </h1>
            <p className="sp-intro">
              Connect a familiar account to explore your site
              <br className="sp-wide-break" /> and find the people who need your product.
            </p>
            <Glass className="sp-connect-card">
              {known || chooser ? (
                <>
                  {known ? (
                    <>
                      <div className="sp-card-label">READY ON THIS MAC</div>
                      {account}
                    </>
                  ) : (
                    alternatives
                  )}
                  {primary(
                    known
                      ? `Continue with ${name}`
                      : screen === "empty"
                        ? "Choose a provider to continue"
                        : `Connect ${name}`,
                    known
                      ? () => setNotice("Preview only: your product research would begin now.")
                      : begin,
                    screen === "empty"
                  )}
                  <p className="sp-footnote">
                    {known
                      ? "Already signed in. You’re ready to go."
                      : "Sign in in your browser, then come right back."}
                  </p>
                  {known && (
                    <>
                      <p className="sp-alternatives-label">Or choose another provider</p>
                      {alternatives}
                    </>
                  )}
                </>
              ) : (
                statusCard
              )}
            </Glass>
          </div>
          <div className="sp-back">← Your product is saved</div>
        </section>
        <Marble>
          <div className="sp-stage">
            <div className="sp-stage-caption">YOUR NEXT CHAPTER</div>
            <Glass className="sp-product-paper">
              <div className="sp-paper-header">
                <span className="sp-site-icon">↗</span>
                <span>yourproduct.com</span>
                <span className="sp-saved">Saved ✓</span>
              </div>
              <h2>
                Good ideas deserve
                <br />
                <em>their first customers.</em>
              </h2>
              <div className="sp-paper-rule" />
              <div className="sp-paper-step">
                <span>01</span>
                <div>
                  <b>Get to know your product</b>
                  <p>What it does. Who it helps.</p>
                </div>
              </div>
              <div className="sp-paper-step sp-future">
                <span>02</span>
                <div>
                  <b>Find your people</b>
                  <p>Real companies. Reasons they fit.</p>
                </div>
              </div>
              <div className="sp-paper-step sp-future">
                <span>03</span>
                <div>
                  <b>Make your first move</b>
                  <p>A relevant reason to say hello.</p>
                </div>
              </div>
            </Glass>
            <p className="sp-stage-note">Your product. Your AI. Your next customer.</p>
          </div>
        </Marble>
      </main>
      <footer className="sp-preview-footer">
        <span>Preview only · no accounts are changed</span>
        <span role="status">{notice || "Each tab shows one connection state"}</span>
        <span>Final flow: welcome → your product → AI connection</span>
      </footer>
    </div>
  );
}
