// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";
import { buildProviders, byokProvidersHeader } from "../lib/providers";

describe("buildProviders 3x3 (userGemini × userHunter)", () => {
  const G = "user-g";
  const H = "user-h";
  const envBoth = { GEMINI_API_KEY: "env-g", HUNTER_API_KEY: "env-h" };

  // Row: userGemini ABSENT
  it("[ABSENT × ABSENT] → operator (or stub if no env)", () => {
    const b = buildProviders({ env: envBoth });
    expect(b.mode).toBe("operator");
    expect(b.byokProviders).toEqual([]);
    expect(b.operatorPaidSides).toEqual(["gemini", "hunter"]);
  });
  it("[ABSENT × PRESENT] → byok-hunter (hunter user, gemini operator → operator overall)", () => {
    const b = buildProviders({ userHunterKey: H, env: envBoth });
    expect(b.mode).toBe("operator");
    expect(b.byokProviders).toEqual(["hunter"]);
    expect(b.operatorPaidSides).toEqual(["gemini"]);
  });
  it("[ABSENT × EMPTY-STR] → operator", () => {
    const b = buildProviders({ userHunterKey: "   ", env: envBoth });
    expect(b.mode).toBe("operator");
    expect(b.byokProviders).toEqual([]);
  });

  // Row: userGemini PRESENT
  it("[PRESENT × ABSENT] → mixed; gemini user-paid, hunter operator-paid", () => {
    const b = buildProviders({ userGeminiKey: G, env: envBoth });
    expect(b.mode).toBe("operator");
    expect(b.byokProviders).toEqual(["gemini"]);
    expect(b.operatorPaidSides).toEqual(["hunter"]);
  });
  it("[PRESENT × PRESENT] → byok, both sides user-paid", () => {
    const b = buildProviders({ userGeminiKey: G, userHunterKey: H, env: envBoth });
    expect(b.mode).toBe("byok");
    expect(b.byokProviders).toEqual(["gemini", "hunter"]);
    expect(b.operatorPaidSides).toEqual([]);
  });
  it("[PRESENT × EMPTY-STR] → mixed; gemini user-paid, hunter operator-paid", () => {
    const b = buildProviders({ userGeminiKey: G, userHunterKey: "   ", env: envBoth });
    expect(b.mode).toBe("operator");
    expect(b.byokProviders).toEqual(["gemini"]);
    expect(b.operatorPaidSides).toEqual(["hunter"]);
  });

  // Row: userGemini EMPTY-STR
  it("[EMPTY-STR × ABSENT] → operator (whitespace trimmed)", () => {
    const b = buildProviders({ userGeminiKey: "   ", env: envBoth });
    expect(b.mode).toBe("operator");
    expect(b.byokProviders).toEqual([]);
  });
  it("[EMPTY-STR × PRESENT] → mixed; hunter user-paid", () => {
    const b = buildProviders({ userGeminiKey: "   ", userHunterKey: H, env: envBoth });
    expect(b.mode).toBe("operator");
    expect(b.byokProviders).toEqual(["hunter"]);
    expect(b.operatorPaidSides).toEqual(["gemini"]);
  });
  it("[EMPTY-STR × EMPTY-STR] → operator", () => {
    const b = buildProviders({ userGeminiKey: "   ", userHunterKey: "   ", env: envBoth });
    expect(b.mode).toBe("operator");
    expect(b.byokProviders).toEqual([]);
  });
});

describe("buildProviders — stub + provider selection", () => {
  it("returns stub mode when neither user nor operator keys present", () => {
    const { llm, email, mode, byokProviders } = buildProviders({ env: {} });
    expect(mode).toBe("stub");
    expect(llm.name).toBe("fake");
    expect(email.name).toBe("fake");
    expect(byokProviders).toEqual([]);
  });

  it("byok-gemini only (no operator hunter) → byok mode, hunter is fake", () => {
    const { mode, llm, email, byokProviders, operatorPaidSides } = buildProviders({
      userGeminiKey: "user-g",
      env: {},
    });
    expect(mode).toBe("byok");
    expect(llm.name).toBe("gemini");
    expect(email.name).toBe("fake");
    expect(byokProviders).toEqual(["gemini"]);
    expect(operatorPaidSides).toEqual([]);
  });
});

describe("byokProvidersHeader", () => {
  it("renders comma-joined values", () => {
    expect(byokProvidersHeader([])).toBe("none");
    expect(byokProvidersHeader(["gemini"])).toBe("gemini");
    expect(byokProvidersHeader(["gemini", "hunter"])).toBe("gemini,hunter");
  });
});
