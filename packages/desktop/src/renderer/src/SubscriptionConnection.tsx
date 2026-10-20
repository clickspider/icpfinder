import { useCallback, useEffect, useRef, useState } from "react";
import {
  type LoginAttempt,
  type ProviderId,
  type SubscriptionStatus,
  suggestedProvider,
} from "../../shared/subscriptions";
import type { State } from "../../shared/types";
import { Glass, Marble } from "./glass";
import { ProviderMark } from "./ProviderMark";
import { api, cleanError, Mark } from "./ui";
import "./subscription-preview.css";

const PROVIDERS: Array<{ id: ProviderId; name: string }> = [
  { id: "claude", name: "Claude" },
  { id: "codex", name: "ChatGPT" },
  { id: "xai", name: "Grok" },
];

export function SubscriptionConnection({
  state,
  product,
  onState,
  onContinue,
  onBack,
}: {
  state: State;
  product: string;
  onState: (state: State) => void;
  onContinue: () => Promise<void> | void;
  onBack: () => void;
}) {
  const [statuses, setStatuses] = useState<SubscriptionStatus[] | null>(null);
  const [provider, setProvider] = useState<ProviderId | null>(null);
  const [attempt, setAttempt] = useState<LoginAttempt | null>(null);
  const [busy, setBusy] = useState(false);
  const [expired, setExpired] = useState(false);
  const [error, setError] = useState("");
  const live = useRef(true);
  const pending = useRef<string | null>(null);
  const acting = useRef(false);
  const preferred = useRef({
    provider: state.settings.provider,
    confirmed: state.settings.providerConfirmed,
  });
  const selected = statuses?.find((item) => item.provider === provider);
  const connected = selected?.connected === true;
  const name = PROVIDERS.find((item) => item.id === provider)?.name ?? "your provider";
  const waiting = attempt?.status === "pending";
  const success = attempt?.status === "complete";

  const refresh = useCallback(async (suggest = false) => {
    const result = await api().subscriptionStatus();
    if (!live.current) return;
    setStatuses(result);
    if (suggest) {
      setProvider(
        suggestedProvider(result, preferred.current.provider, preferred.current.confirmed)
      );
    }
  }, []);
  useEffect(() => {
    live.current = true;
    void refresh(true).catch((e) => {
      if (live.current) setError(cleanError(e));
    });
    return () => {
      live.current = false;
      if (pending.current)
        void api()
          .cancelSubscriptionLogin(pending.current)
          .catch(() => {});
    };
  }, [refresh]);

  const attemptId = attempt?.id;
  useEffect(() => {
    if (!waiting || !attemptId) return;
    let stopped = false;
    let inFlight = false;
    const id = attemptId;
    const timer = setInterval(async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const next = await api().subscriptionLoginState(id);
        if (stopped || pending.current !== id) return;
        setAttempt(next);
        if (next.status !== "pending") pending.current = null;
        if (next.status === "complete") await refresh();
        if (next.status === "failed")
          setError(next.error ?? "We couldn’t connect. Please try again.");
      } catch (e) {
        if (!stopped) setError(cleanError(e));
      } finally {
        inFlight = false;
      }
    }, 800);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [attemptId, waiting, refresh]);

  const act = async (action: () => Promise<void>) => {
    if (acting.current) return;
    acting.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      if (live.current) setError(cleanError(e));
    } finally {
      acting.current = false;
      if (live.current) setBusy(false);
    }
  };
  const cancel = async () => {
    if (!pending.current) return;
    const id = pending.current;
    await api().cancelSubscriptionLogin(id);
    pending.current = null;
    setAttempt((current) => (current ? { ...current, status: "cancelled" } : null));
  };
  const connect = () =>
    act(async () => {
      if (!provider) return;
      if (connected) {
        // Recheck before allowing any AI request, including after a session expired elsewhere.
        const current = await api().subscriptionStatus();
        setStatuses(current);
        if (!current.find((item) => item.provider === provider)?.connected) {
          setAttempt(null);
          setExpired(true);
          return;
        }
        onState(await api().saveSettings({ provider }));
        await onContinue();
        return;
      }
      setExpired(false);
      const next = await api().beginSubscriptionLogin(provider);
      if (!live.current) {
        await api().cancelSubscriptionLogin(next.id);
        return;
      }
      pending.current = next.status === "pending" ? next.id : null;
      setAttempt(next);
    });
  const choose = (next: ProviderId) => {
    setProvider(next);
    setExpired(false);
    setAttempt(null);
    setError("");
  };
  const tiles = (
    <fieldset className="sp-provider-tiles" aria-label="Choose your provider">
      {PROVIDERS.filter((item) => !connected || item.id !== provider).map((item) => (
        <button
          type="button"
          key={item.id}
          disabled={busy}
          aria-pressed={!connected && provider === item.id}
          className={!connected && provider === item.id ? "is-picked" : ""}
          onClick={() => choose(item.id)}
        >
          <ProviderMark provider={item.id} size={34} />
          <strong>{item.name}</strong>
          <span>
            {statuses?.find((s) => s.provider === item.id)?.connected ? "Ready to use" : "Connect"}
          </span>
          {!connected && provider === item.id && <i aria-hidden="true">✓</i>}
        </button>
      ))}
    </fieldset>
  );
  const button = (label: string, action: () => void, disabled = false) => (
    <button className="sp-continue" type="button" disabled={busy || disabled} onClick={action}>
      {busy ? "One moment…" : label}
      <span aria-hidden="true">↗</span>
    </button>
  );
  return (
    <div className="sp-preview sp-production">
      <main className={`sp-canvas sp-${connected ? "recommended" : "choice"}`}>
        <section className="sp-sidebar">
          <div className="sp-brand drag">
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
              Connect a familiar account to explore your product
              <br /> and find the people who need it.
            </p>
            <Glass className="sp-connect-card">
              {!statuses ? (
                <div className="sp-status-card">
                  {!error && <span className="sp-status-spinner" aria-hidden="true" />}
                  <h2>{error ? "Couldn’t check your accounts" : "Checking your accounts…"}</h2>
                  <p>{error || "Looking for an existing sign-in on this Mac."}</p>
                  {error && button("Check again", () => void act(() => refresh(true)))}
                </div>
              ) : waiting ? (
                <div className="sp-status-card">
                  {provider && <ProviderMark provider={provider} size={40} />}
                  <h2>
                    {attempt.code ? `Connect your ${name} account` : `Finish signing in to ${name}`}
                  </h2>
                  <p>
                    {attempt.code
                      ? "Enter this code on the sign-in page in your browser."
                      : "Continue in your browser. We’ll bring you back here when you’re connected."}
                  </p>
                  {attempt.code && <div className="sp-device-code">{attempt.code}</div>}
                  {attempt.url &&
                    button(
                      "Open sign-in page",
                      () =>
                        void act(async () => {
                          if (attempt.url) await api().openExternal(attempt.url);
                        })
                    )}
                  <p className="sp-waiting">Waiting for you to finish signing in…</p>
                  <button
                    className="sp-link"
                    type="button"
                    disabled={busy}
                    onClick={() => void act(cancel)}
                  >
                    Cancel sign-in
                  </button>
                </div>
              ) : expired ? (
                <div className="sp-status-card">
                  {provider && <ProviderMark provider={provider} size={40} />}
                  <h2>Let’s reconnect</h2>
                  <p>
                    Your {name} session has expired. Sign in again to pick up where you left off.
                  </p>
                  {button(`Reconnect ${name}`, () => void connect())}
                  <button
                    type="button"
                    className="sp-link"
                    disabled={busy}
                    onClick={() => {
                      setProvider(null);
                      setExpired(false);
                      setError("");
                    }}
                  >
                    Choose another provider
                  </button>
                </div>
              ) : attempt?.status === "failed" || attempt?.status === "cancelled" ? (
                <div className="sp-status-card">
                  {provider && <ProviderMark provider={provider} size={40} />}
                  <h2>
                    {attempt.status === "cancelled" ? "Sign-in cancelled" : "We couldn’t connect"}
                  </h2>
                  <p>
                    {attempt.status === "cancelled"
                      ? "Your product is still here. Try again whenever you’re ready."
                      : "The connection failed. Please try signing in again."}
                  </p>
                  {button("Try signing in again", () => void connect())}
                  <button
                    type="button"
                    className="sp-link"
                    disabled={busy}
                    onClick={() => {
                      setProvider(null);
                      setAttempt(null);
                      setError("");
                    }}
                  >
                    Choose another provider
                  </button>
                </div>
              ) : success ? (
                <div className="sp-status-card">
                  <span className="sp-confirmed">✓</span>
                  <h2>You’re connected.</h2>
                  <p>{name} is ready to help you find your buyers.</p>
                  {button("Continue to my product", () => void connect(), !connected)}
                  {!connected && (
                    <button
                      type="button"
                      className="sp-link"
                      onClick={() => void act(() => refresh())}
                    >
                      Check connection again
                    </button>
                  )}
                </div>
              ) : selected && !selected.installed ? (
                <div className="sp-status-card">
                  {provider && <ProviderMark provider={provider} size={40} />}
                  <h2>Let’s get your connection ready</h2>
                  <p>
                    {provider === "claude"
                      ? "The bundled Claude runtime is missing. Rebuild the local app or reinstall IcpFinder to restore it."
                      : "The bundled Codex runtime is missing. Rebuild the local app or reinstall IcpFinder to restore it."}
                  </p>
                  <button
                    type="button"
                    className="sp-link"
                    onClick={() => void act(() => refresh())}
                  >
                    Check again
                  </button>
                  <button
                    type="button"
                    className="sp-link"
                    onClick={() => {
                      setProvider(null);
                      setAttempt(null);
                    }}
                  >
                    Choose another provider
                  </button>
                </div>
              ) : (
                <>
                  {connected ? (
                    <>
                      <div className="sp-card-label">READY ON THIS MAC</div>
                      <div className="sp-account">
                        {provider && <ProviderMark provider={provider} size={40} />}
                        <div>
                          <strong>{name}</strong>
                          <span>Already signed in on this Mac</span>
                        </div>
                        <span className="sp-ready">✓</span>
                      </div>
                    </>
                  ) : (
                    tiles
                  )}
                  {button(
                    !provider
                      ? "Choose a provider to continue"
                      : connected
                        ? `Continue with ${name}`
                        : `Connect ${name}`,
                    () => void connect(),
                    !provider
                  )}
                  <p className="sp-footnote">
                    {connected
                      ? "Already signed in. You’re ready to go."
                      : "Sign in in your browser, then come right back."}
                  </p>
                  {connected && (
                    <>
                      <p className="sp-alternatives-label">Or choose another provider</p>
                      {tiles}
                    </>
                  )}
                </>
              )}
              {statuses && (error || selected?.error) && (
                <p className="sp-connection-error" role="alert">
                  {error || selected?.error}
                </p>
              )}
            </Glass>
          </div>
          <button
            type="button"
            className="sp-link sp-product-back"
            disabled={busy}
            onClick={() =>
              void act(async () => {
                await cancel();
                onBack();
              })
            }
          >
            ← Back to your product
          </button>
        </section>
        <Marble>
          <div className="sp-stage">
            <div className="sp-stage-caption">YOUR NEXT CHAPTER</div>
            <Glass className="sp-product-paper">
              <div className="sp-paper-header">
                <span className="sp-site-icon">↗</span>
                <span className="sp-product-title">{product || "Your product"}</span>
                <span className="sp-saved">Ready ✓</span>
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
    </div>
  );
}
