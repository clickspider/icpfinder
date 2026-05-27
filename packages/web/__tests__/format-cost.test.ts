// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";
import { formatCostCents, formatCostUsd } from "../lib/format-cost";

describe("formatCostCents", () => {
  it("renders zero as $0.00", () => {
    expect(formatCostCents(0)).toBe("$0.00");
    expect(formatCostCents(-1)).toBe("$0.00");
  });

  it("renders sub-cent amounts as <$0.01", () => {
    expect(formatCostCents(0.13)).toBe("<$0.01");
    expect(formatCostCents(0.99)).toBe("<$0.01");
  });

  it("renders one cent as $0.01", () => {
    expect(formatCostCents(1)).toBe("$0.01");
  });

  it("renders dollars-and-cents", () => {
    expect(formatCostCents(10)).toBe("$0.10");
    expect(formatCostCents(105.05)).toBe("$1.05");
    expect(formatCostCents(199.99)).toBe("$2.00");
    expect(formatCostCents(12345)).toBe("$123.45");
  });

  it("handles NaN / Infinity safely", () => {
    expect(formatCostCents(Number.NaN)).toBe("$0.00");
    expect(formatCostCents(Number.POSITIVE_INFINITY)).toBe("$0.00");
  });
});

describe("formatCostUsd", () => {
  it("renders zero", () => {
    expect(formatCostUsd(0)).toBe("$0.00");
  });

  it("renders sub-cent USD as <$0.01", () => {
    expect(formatCostUsd(0.001)).toBe("<$0.01");
  });

  it("renders standard dollar amounts", () => {
    expect(formatCostUsd(1.05)).toBe("$1.05");
    expect(formatCostUsd(123.45)).toBe("$123.45");
  });
});
