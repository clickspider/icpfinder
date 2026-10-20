// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";
import { scoreChecks } from "../src/main/engine";
import { DEFAULT_SCORING, score } from "../src/shared/scoring";

const NOW = new Date("2026-10-20T12:00:00Z");
const yes = (c: string) => ({ criterion: c, verdict: "yes" as const });
const unk = (c: string) => ({ criterion: c, verdict: "unknown" as const });

describe("scoreChecks", () => {
  it("gives 100 for every must-have confirmed and a fresh, confirmed signal", () => {
    expect(scoreChecks([yes("a"), yes("b")], true, "2026-10-10", null, 120, NOW)).toBe(100);
  });

  it("keeps a company with nothing confirmed below the 70 bar", () => {
    expect(
      scoreChecks([unk("a"), unk("b"), unk("c")], true, "2026-10-10", null, 120, NOW)
    ).toBeLessThan(70);
  });

  it("rules out a proven 'no' or a deal-breaker", () => {
    expect(
      scoreChecks([yes("a"), { criterion: "b", verdict: "no" }], true, "2026-10-10", null, 120, NOW)
    ).toBe(0);
    expect(scoreChecks([yes("a")], true, "2026-10-10", "uses a competitor", 120, NOW)).toBe(0);
  });

  it("counts an old signal for less", () => {
    const fresh = scoreChecks([yes("a")], true, "2026-10-10", null, 120, NOW);
    const old = scoreChecks([yes("a")], true, "2025-01-01", null, 120, NOW);
    expect(old).toBeLessThan(fresh);
  });
});

describe("per-product scoring", () => {
  const input = {
    checks: [{ verdict: "yes" as const }, { verdict: "unknown" as const }],
    signalConfirmed: true,
    signalDate: "2026-10-10",
  };
  it("is deterministic and matches the default", () => {
    expect(score(input, DEFAULT_SCORING, NOW)).toBe(score(input, DEFAULT_SCORING, NOW));
    expect(score(input, DEFAULT_SCORING, NOW)).toBe(
      scoreChecks([yes("a"), unk("b")], true, "2026-10-10", null, 120, NOW)
    );
  });
  it("moves with the weights and keeps a perfect fit at 100", () => {
    const fit = { ...DEFAULT_SCORING, mustWeight: 80 };
    expect(score(input, fit, NOW)).not.toBe(score(input, DEFAULT_SCORING, NOW));
    const perfect = { ...input, checks: [{ verdict: "yes" as const }] };
    expect(score(perfect, fit, NOW)).toBe(100);
  });
});
