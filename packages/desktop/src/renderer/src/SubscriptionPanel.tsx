import { useCallback, useEffect, useState } from "react";
import { PROVIDER_NAMES } from "../../shared/provider-models";
import type { LoginAttempt, ProviderId, SubscriptionStatus } from "../../shared/subscriptions";
import type { State } from "../../shared/types";
import { api, cleanError, ModelPicker, ProviderLogo } from "./ui";

export function SubscriptionPanel({
  state,
  onState,
  onContinue,
}: {
  state: State;
  onState: (state: State) => void;
  onContinue?: () => void;
}) {
  const selected = state.settings.provider ?? "claude";
  const [statuses, setStatuses] = useState<SubscriptionStatus[]>([]);
  const [attempt, setAttempt] = useState<LoginAttempt | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => setStatuses(await api().subscriptionStatus()), []);
  useEffect(() => {
    void refresh().catch((e) => setError(cleanError(e)));
  }, [refresh]);
  useEffect(() => {
    if (attempt?.status !== "pending") return;
    let live = true;
    let inFlight = false;
    const timer = setInterval(() => {
      if (inFlight) return;
      inFlight = true;
      void api()
        .subscriptionLoginState(attempt.id)
        .then(async (next) => {
          if (!live) return;
          setAttempt(next);
          if (next.status === "complete") {
            setNote("Signed in. Select this provider to use it.");
            await refresh();
          }
          if (next.status === "failed") setError(next.error ?? "Sign-in failed.");
        })
        .catch((e) => {
          if (live) setError(cleanError(e));
        })
        .finally(() => {
          inFlight = false;
        });
    }, 800);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [attempt?.id, attempt?.status, refresh]);

  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setNote("");
    try {
      await fn();
    } catch (e) {
      setError(cleanError(e));
    } finally {
      setBusy(false);
    }
  };
  const signIn = (provider: ProviderId) =>
    act(async () => {
      if (attempt?.status === "pending") await api().cancelSubscriptionLogin(attempt.id);
      setAttempt(await api().beginSubscriptionLogin(provider));
    });
  const connected = statuses.find((status) => status.provider === selected)?.connected;
  const DESCRIPTION: Record<ProviderId, string> = {
    claude: "Uses your Claude Code subscription login on this Mac.",
    codex: "Uses your ChatGPT account through Codex.",
    xai: "Your Grok subscription. Model and tool access depend on your plan.",
  };
  return (
    <section className="subscription-panel sp" aria-label="AI subscriptions">
      <div className="sp-head">
        <div>
          <h2>Your AI subscription</h2>
          <p>Choose the account that powers your research and browser tasks.</p>
        </div>
        <div className="sp-tools">
          <button
            className="ghost btn"
            type="button"
            disabled={busy}
            onClick={() => void act(refresh)}
          >
            Refresh
          </button>
          <button
            className="ghost btn"
            type="button"
            disabled={busy || !connected || attempt?.status === "pending"}
            title="Makes one small request using the selected subscription"
            onClick={() =>
              void act(async () => {
                setNote(await api().verifySubscription());
              })
            }
          >
            {busy ? "Working…" : "Test connection"}
          </button>
        </div>
      </div>
      <div className="sp-list">
        {(["claude", "codex", "xai"] as const).map((provider) => {
          const status = statuses.find((item) => item.provider === provider);
          const inUse = selected === provider;
          return (
            <div key={provider} className={`sp-card ${inUse ? "on" : ""}`}>
              <ProviderLogo provider={provider} size={36} />
              <div className="sp-main">
                <div className="sp-name">
                  {PROVIDER_NAMES[provider]}
                  {inUse && <span className="sp-chip">In use</span>}
                </div>
                <div className="sp-desc">{DESCRIPTION[provider]}</div>
                {inUse && (
                  <div style={{ marginTop: 10 }}>
                    <ModelPicker
                      provider={provider}
                      value={state.settings.model}
                      onChange={(model) =>
                        void act(async () => {
                          onState(await api().saveSettings({ model }));
                        })
                      }
                    />
                  </div>
                )}
                {status?.error && (
                  <p className="sp-desc" role="status">
                    {status.error}
                  </p>
                )}
              </div>
              <div className="sp-side">
                <span className={`sp-status ${status?.connected ? "sp-on" : ""}`}>
                  {!status
                    ? "Checking…"
                    : status.connected
                      ? "Signed in"
                      : !status.installed
                        ? "Not available"
                        : "Not signed in"}
                </span>
                {status && !status.installed ? (
                  <button
                    className="ghost btn"
                    type="button"
                    onClick={() =>
                      void api().openExternal(
                        provider === "claude"
                          ? "https://code.claude.com/docs/en/setup"
                          : "https://developers.openai.com/codex/cli/"
                      )
                    }
                  >
                    How to set up
                  </button>
                ) : status?.connected ? (
                  <>
                    {!inUse && (
                      <button
                        className="ob-cta"
                        type="button"
                        disabled={busy || attempt?.status === "pending"}
                        onClick={() =>
                          void act(async () => {
                            onState(await api().saveSettings({ provider }));
                          })
                        }
                      >
                        Use this account
                      </button>
                    )}
                    <button
                      className="ghost btn sp-link"
                      type="button"
                      disabled={busy || attempt?.status === "pending"}
                      onClick={() => void signIn(provider)}
                    >
                      Change account
                    </button>
                  </>
                ) : (
                  <button
                    className="ob-cta"
                    type="button"
                    disabled={busy || !status?.installed || attempt?.status === "pending"}
                    onClick={() => void signIn(provider)}
                  >
                    Sign in
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {attempt?.status === "pending" && (
        <div className="sp-pending" role="status">
          <span>
            Finish signing in to {PROVIDER_NAMES[attempt.provider]} in your browser.
            {attempt.code && (
              <>
                {" "}
                Enter this code: <strong>{attempt.code}</strong>
              </>
            )}
          </span>
          {attempt.url && (
            <button
              className="ob-cta"
              type="button"
              onClick={() => void api().openExternal(attempt.url ?? "")}
            >
              Open sign-in page
            </button>
          )}
          <button
            className="ghost btn"
            type="button"
            onClick={() =>
              void act(async () => {
                await api().cancelSubscriptionLogin(attempt.id);
                setAttempt(null);
                await refresh();
              })
            }
          >
            Cancel
          </button>
        </div>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {note && (
        <p className="sp-note" role="status">
          {note}
        </p>
      )}
      {onContinue && (
        <button
          className="ob-cta"
          type="button"
          style={{ alignSelf: "flex-start" }}
          disabled={busy || !connected || attempt?.status === "pending"}
          onClick={onContinue}
        >
          Continue with {PROVIDER_NAMES[selected]}
        </button>
      )}
    </section>
  );
}
