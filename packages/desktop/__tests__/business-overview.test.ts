import { describe, expect, it } from "vitest";
import { productFromIdea } from "../src/main/idea";
import { inferredBusiness, marketplaceOf, sellerSummary } from "../src/shared/business-overview";

describe("business overview semantics", () => {
  it("does not convert funding, legacy model, or absence of evidence into progress", () => {
    for (const stage of ["Idea", "Pre-seed", "Seed", "Series A+"]) {
      expect(inferredBusiness({ stage, model: "B2B" })).toMatchObject({
        audience: undefined,
        progress: undefined,
      });
    }
    expect(
      inferredBusiness({ audience: "Investors", progress: "Seed", marketplace: "true" })
    ).toMatchObject({ audience: undefined, progress: undefined, marketplace: undefined });
  });
  it("keeps supported inference separate from user confirmation", () => {
    expect(
      inferredBusiness({
        audience: "Both",
        progress: "Already serving customers",
        marketplace: true,
      })
    ).toEqual({
      audience: "Both",
      progress: "Already serving customers",
      marketplace: true,
      confirmedFields: [],
    });
  });
  it("uses corrections for recommendations without leaking old funding or model values", () => {
    const p = productFromIdea("Old website text says enterprise marketplace", {
      name: "Acme",
      sell: "A planner",
      audience: "Businesses",
    });
    const corrected = {
      ...p,
      sell: "Planning for families",
      audience: "Consumers" as const,
      progress: "Looking for first customers" as const,
      model: "Marketplace" as const,
      stage: "Seed" as const,
      marketplace: false,
      confirmedFields: ["sell", "audience", "marketplace"],
    };
    const summary = sellerSummary(corrected);
    expect(summary).toContain("What they offer (confirmed by user): Planning for families");
    expect(summary).toContain("Who this business sells to (confirmed by user): Consumers");
    expect(summary).toContain(
      "This business's current progress (suggested; not confirmed): Looking for first customers"
    );
    expect(summary).toContain("Not a marketplace");
    expect(summary).not.toContain("Seed");
    expect(summary).not.toContain("enterprise marketplace");
    expect(summary).toContain("USER'S OWN BUSINESS");
  });
  it("exposes legacy marketplace context for review and honors explicit correction", () => {
    const p = productFromIdea("A platform", { sell: "A platform" });
    expect(marketplaceOf({ ...p, model: "Marketplace" })).toBe(true);
    expect(marketplaceOf({ ...p, model: "Marketplace", marketplace: false })).toBe(false);
  });
});
