import { describe, expect, it } from "vitest";
import { businessEditPatch } from "../src/shared/business-edit";
import type { Product } from "../src/shared/types";

const original: Product = {
  name: "Saved",
  url: "https://example.com",
  sell: "Original offer",
  problem: "Original problem",
  different: "",
  price: "legacy",
  siteText: "original context",
  readAt: "2026-01-01",
  audience: "Businesses",
  marketplace: true,
};
describe("reviewed business edits", () => {
  it("applies corrections without replacing source context or legacy data", () => {
    const patch = businessEditPatch(original, {
      ...original,
      name: " New name ",
      sell: " New offer ",
      price: "guess",
      siteText: "new context",
      marketplace: false,
    });
    expect({ ...original, ...patch }).toMatchObject({
      name: "New name",
      sell: "New offer",
      price: "legacy",
      siteText: "original context",
      url: original.url,
      marketplace: false,
    });
    expect(patch.confirmedFields).toContain("marketplace");
    expect(original.name).toBe("Saved");
  });
  it("does not introduce a marketplace assumption for ordinary businesses", () => {
    const p = { ...original, marketplace: undefined };
    expect(businessEditPatch(p, p)).not.toHaveProperty("marketplace");
  });
  it("preserves explicit progress and audience corrections without deriving funding", () => {
    const patch = businessEditPatch(original, {
      ...original,
      audience: "Consumers",
      progress: "Preparing to launch",
      stage: "Series A+",
    });
    expect(patch.audience).toBe("Consumers");
    expect(patch.progress).toBe("Preparing to launch");
    expect(patch).not.toHaveProperty("stage");
  });
});
