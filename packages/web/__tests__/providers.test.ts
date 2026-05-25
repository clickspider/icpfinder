// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";
import { buildProviders } from "../lib/providers";

describe("buildProviders", () => {
  it("returns stub mode when neither user nor operator keys are present", () => {
    const { llm, email, mode } = buildProviders({ env: {} });
    expect(mode).toBe("stub");
    expect(llm.name).toBe("fake");
    expect(email.name).toBe("fake");
  });

  it("returns operator mode when env has both keys and user supplies none", () => {
    const { mode, llm, email } = buildProviders({
      env: { GEMINI_API_KEY: "env-g", HUNTER_API_KEY: "env-h" },
    });
    expect(mode).toBe("operator");
    expect(llm.name).toBe("gemini");
    expect(email.name).toBe("hunter");
  });

  it("returns operator mode when only one operator key is set (live llm + fake email)", () => {
    const { mode, llm, email } = buildProviders({ env: { GEMINI_API_KEY: "env-g" } });
    expect(mode).toBe("operator");
    expect(llm.name).toBe("gemini");
    expect(email.name).toBe("fake");
  });

  it("returns byok mode when both user keys are supplied (overrides operator env)", () => {
    const { mode, llm, email } = buildProviders({
      userGeminiKey: "user-g",
      userHunterKey: "user-h",
      env: { GEMINI_API_KEY: "env-g", HUNTER_API_KEY: "env-h" },
    });
    expect(mode).toBe("byok");
    expect(llm.name).toBe("gemini");
    expect(email.name).toBe("hunter");
  });

  it("refuses partial BYOK — single user key falls back to operator", () => {
    const { mode } = buildProviders({
      userGeminiKey: "user-g",
      env: { GEMINI_API_KEY: "env-g", HUNTER_API_KEY: "env-h" },
    });
    expect(mode).toBe("operator");
  });

  it("trims whitespace-only user keys back to operator mode", () => {
    const { mode } = buildProviders({
      userGeminiKey: "   ",
      userHunterKey: "   ",
      env: { GEMINI_API_KEY: "env-g", HUNTER_API_KEY: "env-h" },
    });
    expect(mode).toBe("operator");
  });
});
