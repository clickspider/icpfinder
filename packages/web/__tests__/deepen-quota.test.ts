// SPDX-License-Identifier: MIT

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { reserveDeepen } from "../lib/deepen-quota";

describe("reserveDeepen", () => {
  const originalEnv = process.env.ICPFINDER_DEEPEN_PER_IP_PER_DAY;
  beforeEach(() => {
    process.env.ICPFINDER_DEEPEN_PER_IP_PER_DAY = "3";
  });
  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.ICPFINDER_DEEPEN_PER_IP_PER_DAY;
    } else {
      process.env.ICPFINDER_DEEPEN_PER_IP_PER_DAY = originalEnv;
    }
  });

  it("allows up to the per-IP limit on operator quota", () => {
    const ip = `op-${Math.random()}`;
    expect(reserveDeepen(ip, false).allowed).toBe(true);
    expect(reserveDeepen(ip, false).allowed).toBe(true);
    expect(reserveDeepen(ip, false).allowed).toBe(true);
    const fourth = reserveDeepen(ip, false);
    expect(fourth.allowed).toBe(false);
    expect(fourth.remaining).toBe(0);
  });

  it("BYOK is unlimited regardless of operator quota state", () => {
    const ip = `byok-${Math.random()}`;
    for (let i = 0; i < 10; i += 1) {
      expect(reserveDeepen(ip, true).allowed).toBe(true);
    }
  });

  it("isolates buckets across distinct IPs", () => {
    const a = `ip-a-${Math.random()}`;
    const b = `ip-b-${Math.random()}`;
    reserveDeepen(a, false);
    reserveDeepen(a, false);
    reserveDeepen(a, false);
    expect(reserveDeepen(a, false).allowed).toBe(false);
    // b is a fresh IP — must still be allowed.
    expect(reserveDeepen(b, false).allowed).toBe(true);
  });
});
