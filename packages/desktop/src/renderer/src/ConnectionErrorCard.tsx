import type { ConnectionFailure, ProviderId } from "../../shared/subscriptions";
import { ProviderMark } from "./ProviderMark";

/** Shared by the live connection flow and its state preview. */
export function ConnectionErrorCard({
  provider,
  failure = "component",
  name,
  busy = false,
  statusCheck = false,
  sessionExpired = false,
  onChoose,
  onRetry,
}: {
  provider?: ProviderId;
  failure?: ConnectionFailure;
  name: string;
  busy?: boolean;
  statusCheck?: boolean;
  sessionExpired?: boolean;
  onChoose: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="sp-status-card" role="alert">
      {provider && <ProviderMark provider={provider} size={40} />}
      <h2>
        {statusCheck
          ? `We couldn’t check your ${name} connection.`
          : `We couldn’t connect to ${name}`}
      </h2>
      <p>
        {statusCheck
          ? "Try again, or choose another provider to continue."
          : failure === "component"
            ? `IcpFinder can’t find or start the software it needs to connect to ${name}. You can use another provider to continue.`
            : failure === "signin"
              ? sessionExpired
                ? `Your ${name} session has expired. Sign in again to continue.`
                : `We couldn’t complete your ${name} sign-in. Please sign in again to continue.`
              : `We couldn’t reach ${name}. Try again in a moment.`}
      </p>
      {failure !== "component" && (
        <button type="button" className="sp-continue" disabled={busy} onClick={onRetry}>
          {failure === "signin" ? "Sign in again" : "Try again"}
        </button>
      )}
      <button
        type="button"
        className={failure === "component" ? "sp-continue" : "sp-link"}
        disabled={busy}
        onClick={onChoose}
      >
        Choose another provider
      </button>
      <p className="sp-footnote">Your business details are saved.</p>
    </div>
  );
}
