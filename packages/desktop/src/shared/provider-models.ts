import type { ProviderId } from "./subscriptions";

export const PROVIDER_NAMES: Record<ProviderId, string> = {
  claude: "Claude",
  codex: "ChatGPT / Codex",
  xai: "xAI / Grok",
};

export const PROVIDER_MODELS: Record<ProviderId, Array<{ id: string; name: string }>> = {
  claude: [
    { id: "sonnet", name: "Sonnet · balanced" },
    { id: "opus", name: "Opus · deeper reasoning" },
    { id: "haiku", name: "Haiku · faster" },
  ],
  codex: [{ id: "", name: "Codex default" }],
  xai: [{ id: "grok-4.7", name: "Grok 4.7" }],
};

export const defaultModel = (provider: ProviderId): string =>
  PROVIDER_MODELS[provider][0]?.id ?? "";

export function isProvider(value: unknown): value is ProviderId {
  return value === "claude" || value === "codex" || value === "xai";
}
