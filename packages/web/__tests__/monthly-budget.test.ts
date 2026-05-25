// SPDX-License-Identifier: MIT

import { describe, expect, it, vi } from "vitest";
import {
  InMemoryMonthlyBudget,
  NoopMonthlyBudget,
  UpstashMonthlyBudget,
} from "../lib/monthly-budget";

describe("NoopMonthlyBudget", () => {
  it("always reports infinite remaining and available", async () => {
    const b = new NoopMonthlyBudget();
    expect(await b.remainingCents()).toBe(Number.POSITIVE_INFINITY);
    expect(await b.isAvailable()).toBe(true);
    await b.recordCost(10_000);
    expect(await b.isAvailable()).toBe(true);
  });
});

describe("InMemoryMonthlyBudget", () => {
  it("blocks new runs once cap is exhausted", async () => {
    const b = new InMemoryMonthlyBudget(100);
    expect(await b.isAvailable()).toBe(true);
    await b.recordCost(60);
    expect(await b.isAvailable()).toBe(true);
    await b.recordCost(40);
    expect(await b.isAvailable()).toBe(false);
    expect(await b.remainingCents()).toBe(0);
  });

  it("ignores zero and negative costs", async () => {
    const b = new InMemoryMonthlyBudget(100);
    await b.recordCost(0);
    await b.recordCost(-5);
    expect(await b.remainingCents()).toBe(100);
  });
});

describe("UpstashMonthlyBudget", () => {
  it("issues GET on remainingCents and scales the integer payload", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify([{ result: "1250" }]), { status: 200 }));
    const b = new UpstashMonthlyBudget({
      url: "https://r/",
      token: "t",
      capCents: 100,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const remaining = await b.remainingCents();
    expect(remaining).toBeCloseTo(100 - 12.5, 5);
  });

  it("recordCost issues INCRBY + EXPIRE", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify([{ result: 50 }, { result: "OK" }]), { status: 200 })
      );
    const b = new UpstashMonthlyBudget({
      url: "https://r",
      token: "t",
      capCents: 100,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await b.recordCost(0.5);
    const body = JSON.parse((fetchImpl.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body[0][0]).toBe("INCRBY");
    expect(body[0][2]).toBe(50);
    expect(body[1][0]).toBe("EXPIRE");
  });

  it("recordCost no-ops on zero/negative", async () => {
    const fetchImpl = vi.fn();
    const b = new UpstashMonthlyBudget({
      url: "https://r",
      token: "t",
      capCents: 100,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await b.recordCost(0);
    await b.recordCost(-1);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
