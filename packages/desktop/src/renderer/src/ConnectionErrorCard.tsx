import type { ConnectionFailure, ProviderId } from "../../shared/subscriptions";
import { ProviderMark } from "./ProviderMark";

/** Shared by the live connection flow and its state preview. */
export function ConnectionErrorCard({
  provider,
  failure = "component",
  name,
  busy = false,
  statusCheck = false,
  onChoose,
  onRetry,
}: {
  provider?: ProviderId;
  failure?: ConnectionFailure;
  name: string;
  busy?: boolean;
  statusCheck?: boolean;
  onChoose: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="sp-status-card" role="alert">
      {provider && <ProviderMark provider={provider} size={40} />}
      <h2>We couldn’t connect to {name}</h2>
      <p>
        {statusCheck
          ? "We couldn’t check your sign-in status. Try checking again, or choose a provider to sign in."
          : failure === "component"
            ? `IcpFinder can’t find or start the software it needs to connect to ${name}. You can use another provider to continue.`
            : failure === "signin"
              ? `Your ${name} sign-in didn’t complete or is no longer valid. Sign in again to continue.`
              : `The connection to ${name} couldn’t complete. Try again in a moment.`}
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
