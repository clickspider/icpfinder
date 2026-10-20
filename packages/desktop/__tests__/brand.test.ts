// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";
import { iconCandidates, pickColors } from "../src/main/brand";

describe("brand", () => {
  it("ranks apple-touch-icon over small icons and adds /favicon.ico last", () => {
    const html = `<link rel="icon" href="/f-16.png" sizes="16x16"><link rel="apple-touch-icon" href="/apple.png">`;
    expect(iconCandidates(html, "https://a.dev/")).toEqual([
      "https://a.dev/apple.png",
      "https://a.dev/f-16.png",
      "https://a.dev/favicon.ico",
    ]);
  });

  it("keeps saturated, frequent, distinct brand colors and drops grays", () => {
    const css = "#ff2d55 #ff2d55 #ff2d55 #ff3355 #ffffff #111111 #888888 #2f8cff #2f8cff #fc0";
    expect(pickColors(css)).toEqual(["#ff2d55", "#2f8cff", "#ffcc00"]);
  });

  it("puts a usable theme-color first", () => {
    expect(pickColors("#2f8cff #2f8cff", "#7c3aed")[0]).toBe("#7c3aed");
  });
});
