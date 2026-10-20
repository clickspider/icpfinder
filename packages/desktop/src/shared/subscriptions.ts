// SPDX-License-Identifier: MIT
export type ConnectionFailure = "signin" | "temporary" | "component";
export type ProviderId = "claude" | "codex" | "xai";
export interface SubscriptionStatus {
  provider: ProviderId;
  installed: boolean;
  connected: boolean;
  label?: string;
  error?: string;
  failure?: ConnectionFailure;
}
export interface LoginAttempt {
  id: string;
  provider: ProviderId;
  status: "pending" | "complete" | "failed" | "cancelled";
  url?: string;
  code?: string;
  error?: string;
  failure?: ConnectionFailure;
}

/** Only suggest a connected account; ambiguous accounts require an explicit choice. */
export function suggestedProvider(
  statuses: SubscriptionStatus[],
  preferred?: ProviderId,
  confirmed = false
): ProviderId | null {
  const ready = statuses.filter((item) => item.connected);
  if (confirmed && ready.some((item) => item.provider === preferred)) return preferred ?? null;
  return ready.length === 1 ? (ready[0]?.provider ?? null) : null;
}
