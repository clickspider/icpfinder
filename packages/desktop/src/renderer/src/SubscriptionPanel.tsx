import { useCallback, useEffect, useState } from "react";
import { PROVIDER_NAMES } from "../../shared/provider-models";
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
  return (
    <section className="subscription-panel" aria-label="AI subscriptions">
      <h1 className="ob-h1">
        Use your <em>AI subscription</em>
      </h1>
      <p className="ob-sub">Choose the account that powers your research and browser tasks.</p>
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
                  {!status
                    ? "Checking…"
                    : status.connected
                      ? "Signed in"
                      : !status.installed
                        ? "CLI not installed"
                        : "Not signed in"}
                </span>
                <button
                  className="secondary btn"
                  type="button"
                  disabled={busy || !status?.installed || attempt?.status === "pending"}
                  onClick={() => void signIn(provider)}
                >
                  {status?.connected ? "Change account" : "Sign in"}
                </button>
                {status?.connected && (
                  <button
                    className="secondary btn"
                    type="button"
                    disabled={busy || attempt?.status === "pending" || selected === provider}
                    onClick={() =>
                      void act(async () => {
                        onState(await api().saveSettings({ provider }));
                      })
                    }
                  >
                    {selected === provider ? "Selected" : "Use this account"}
                  </button>
                )}
              </div>
              <p style={{ fontSize: 13, color: "var(--muted)", margin: "8px 0 0" }}>
                {provider === "claude"
                  ? "Uses your Claude Code subscription login on this Mac."
                  : provider === "codex"
                    ? "Uses your ChatGPT account through Codex."
                    : "Sign in with your eligible Grok subscription. Model and tool access depend on your plan."}
              </p>
              {status && !status.installed && (
                <button
                  className="secondary btn"
                  type="button"
                  onClick={() =>
                    void api().openExternal(
                      provider === "claude"
                        ? "https://code.claude.com/docs/en/setup"
                        : "https://developers.openai.com/codex/cli/"
                    )
                  }
                >
                  Installation instructions
                </button>
              )}
              {status?.error && <p role="status">{status.error}</p>}
              {selected === provider && (
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
          disabled={busy}
          onClick={() => void act(refresh)}
        >
          Refresh status
        </button>
        <button
          className="secondary btn"
          type="button"
          disabled={busy || !connected || attempt?.status === "pending"}
          onClick={() =>
            void act(async () => {
              setNote(await api().verifySubscription());
            })
          }
        >
          {busy ? "Working…" : "Test connection"}
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
        Test connection makes one small request using the selected subscription. Claude and Codex
        sign-in is shared with their CLIs on this Mac.
      </p>
    </section>
  );
}
