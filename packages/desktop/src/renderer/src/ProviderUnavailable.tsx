import type { ProviderId } from "../../shared/subscriptions";
import { ProviderMark } from "./ProviderMark";

/** Shared by the live connection flow and its state preview. */
export function ProviderUnavailable({
  provider,
  name,
  busy = false,
  onChoose,
  onRetry,
}: {
  provider: ProviderId;
  name: string;
  busy?: boolean;
  onChoose: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="sp-status-card" role="alert">
      <ProviderMark provider={provider} size={40} />
      <h2>{name} is unavailable in IcpFinder</h2>
      <p>
        IcpFinder can’t find an app component it needs to connect to {name}. This isn’t a problem
        with your account or subscription.
      </p>
      <p>You can choose another provider to continue. Your business details will stay here.</p>
      <button type="button" className="sp-continue" disabled={busy} onClick={onChoose}>
        Choose another provider
      </button>
      <button type="button" className="sp-link" disabled={busy} onClick={onRetry}>
        {busy ? "Checking…" : "Check again"}
      </button>
    </div>
  );
}
