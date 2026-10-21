import { describe, expect, it } from "vitest";
import { type SubscriptionStatus, suggestedProvider } from "../src/shared/subscriptions";

const accounts = (connected: string[]): SubscriptionStatus[] =>
  (["claude", "codex", "xai"] as const).map((provider) => ({
    provider,
    installed: true,
    connected: connected.includes(provider),
  }));
describe("onboarding account suggestion", () => {
  it("does not promote the default settings provider without a connected account", () => {
    expect(suggestedProvider(accounts([]), "claude")).toBeNull();
  });
  it("recognizes the only connected account", () => {
    expect(suggestedProvider(accounts(["codex"]), "claude")).toBe("codex");
  });
  it("does not guess when multiple accounts are connected", () => {
    expect(suggestedProvider(accounts(["claude", "codex"]), "claude")).toBeNull();
  });
  it("honors a previously confirmed connected provider", () => {
    expect(suggestedProvider(accounts(["claude", "codex"]), "codex", true)).toBe("codex");
    expect(suggestedProvider(accounts([]), "codex", true)).toBeNull();
  });
});
