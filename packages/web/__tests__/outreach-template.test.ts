// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";
import { renderOutreachTemplate } from "../lib/outreach-template";

describe("renderOutreachTemplate", () => {
  it("uses first name when present", () => {
    const out = renderOutreachTemplate({
      firstName: "Jane",
      companyName: "Stripe",
      archetypeRole: "Head of Growth",
      sellingAngle: "Cut research time in half.",
      whyNow: "raised Series C",
    });
    expect(out).toMatch(/^Hi Jane —/);
    expect(out).toContain("raised Series C");
    expect(out).toContain("Cut research time in half.");
  });

  it("falls back to company greeting when firstName null", () => {
    const out = renderOutreachTemplate({
      firstName: null,
      companyName: "Stripe",
      archetypeRole: "Head of Growth",
    });
    expect(out).toContain("Hi Stripe team —");
    expect(out).not.toContain("null");
  });

  it("does not leak `Hi null` for null firstName", () => {
    const out = renderOutreachTemplate({
      firstName: null,
      companyName: "Acme Co",
      archetypeRole: "CEO",
    });
    expect(out).not.toMatch(/Hi null/i);
  });
});
