import type { ProviderId } from "../../shared/subscriptions";
import { ToolLogo } from "./ui";
export function ProviderMark({ provider, size = 30 }: { provider: ProviderId; size?: number }) {
  if (provider === "xai")
    return (
      <span className="sp-xai" style={{ width: size, height: size, fontSize: size * 0.36 }}>
        xAI
      </span>
    );
  return <ToolLogo name={provider} size={size} radius={size * 0.24} />;
}
