import { useCallback, useEffect, useState } from "react";

const PROVIDER_NAMES = { claude: "Claude", codex: "ChatGPT", xai: "Grok" };

import type { LoginAttempt, ProviderId, SubscriptionStatus } from "../../shared/subscriptions";
import type { State } from "../../shared/types";
import { api, cleanError, ModelPicker } from "./ui";

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
  const [testing, setTesting] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [statusError, setStatusError] = useState("");
  const refresh = useCallback(async () => {
    setCheckingStatus(true);
    setStatusError("");
    try {
      setStatuses(await api().subscriptionStatus());
    } catch {
      setStatuses([]);
      setStatusError("We couldn’t check your provider connections. Try again.");
    } finally {
      setCheckingStatus(false);
    }
  }, []);
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
            setNote(
              next.provider === selected
                ? "Signed in. This provider is selected."
                : "Signed in. Select this provider to use it."
            );
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
  }, [attempt?.id, attempt?.status, refresh, selected]);

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
  return (
    <section className="subscription-panel" aria-label="AI subscriptions">
      <h2>Choose your provider</h2>
      <p>Choose which provider powers IcpFinder.</p>
      {statusError && (
        <p className="error" role="alert">
          {statusError}
        </p>
      )}
      <div style={{ display: "grid", gap: 12, marginTop: 20 }}>
        {(["claude", "codex", "xai"] as const).map((provider) => {
          const status = statuses.find((item) => item.provider === provider);
          return (
            <div
              key={provider}
              style={{
                padding: 16,
                border: `1px solid ${selected === provider ? "var(--accent)" : "var(--line, #ddd)"}`,
                borderRadius: 14,
                background: "var(--card)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <strong style={{ flex: 1 }}>{PROVIDER_NAMES[provider]}</strong>
                <span>
                  {checkingStatus
                    ? "Checking…"
                    : !status
                      ? "Status unavailable"
                      : status.connected
                        ? "Signed in"
                        : !status.installed
                          ? "Connection unavailable"
                          : status.error && status.failure !== "signin"
                            ? "Status unavailable"
                            : "Not signed in"}
                </span>
                <button
                  className="secondary btn"
                  type="button"
                  disabled={
                    checkingStatus || busy || !status?.installed || attempt?.status === "pending"
                  }
                  onClick={() => void signIn(provider)}
                >
                  {status?.connected ? "Change account" : "Sign in"}
                </button>
                {status?.connected &&
                  (selected === provider ? (
                    <span className="provider-current">Current provider</span>
                  ) : (
                    <button
                      className="secondary btn"
                      type="button"
                      disabled={
                        checkingStatus ||
                        busy ||
                        attempt?.status === "pending" ||
                        selected === provider
                      }
                      onClick={() =>
                        void act(async () => {
                          onState(await api().saveSettings({ provider }));
                        })
                      }
                    >
                      Use this provider
                    </button>
                  ))}
              </div>
              <p style={{ fontSize: 13, color: "var(--muted)", margin: "8px 0 0" }}>
                {provider === "claude"
                  ? "Use your Claude account with IcpFinder."
                  : provider === "codex"
                    ? "Uses your ChatGPT account through Codex."
                    : "Sign in with your eligible Grok subscription. Model and tool access depend on your plan."}
              </p>
              {status && !status.installed && (
                <p role="alert">
                  IcpFinder couldn’t start the component needed to connect to{" "}
                  {PROVIDER_NAMES[provider]}. Choose another provider to continue. Your business
                  details are saved.
                </p>
              )}
              {status?.error && <p role="status">{status.error}</p>}
              {selected === provider && (
                <div style={{ marginTop: 10 }}>
                  <ModelPicker
                    label="Model"
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
            </div>
          );
        })}
      </div>
      {attempt?.status === "pending" && (
        <div role="status" style={{ marginTop: 16 }}>
          <p>Finish signing in to {PROVIDER_NAMES[attempt.provider]} in your browser.</p>
          {attempt.code && (
            <p>
              Enter this code: <strong>{attempt.code}</strong>
            </p>
          )}
          {attempt.url && (
            <button
              className="secondary btn"
              type="button"
              onClick={() => void api().openExternal(attempt.url ?? "")}
            >
              Open sign-in page
            </button>
          )}
          <button
            className="secondary btn"
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
      {note && <p role="status">{note}</p>}
      <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
        <button
          className="secondary btn"
          type="button"
          disabled={busy || checkingStatus}
          onClick={() => void act(refresh)}
        >
          {statusError ? "Retry status check" : "Refresh status"}
        </button>
        <button
          className="secondary btn"
          type="button"
          disabled={busy || !connected || attempt?.status === "pending"}
          onClick={() =>
            void act(async () => {
              setTesting(true);
              try {
                setNote(await api().verifySubscription());
              } finally {
                setTesting(false);
              }
            })
          }
        >
          {testing ? "Testing…" : "Test connection"}
        </button>
        {onContinue && (
          <button
            className="btn primary"
            type="button"
            disabled={busy || !connected || attempt?.status === "pending"}
            onClick={onContinue}
          >
            Continue with {PROVIDER_NAMES[selected]}
          </button>
        )}
      </div>
      <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 12 }}>
        Test connection sends a small request through the selected provider using your account.
      </p>
    </section>
  );
}
