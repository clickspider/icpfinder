import { describe, expect, it } from "vitest";
import { productFromIdea, validateIdeaDescription } from "../src/main/idea";

describe("written idea brief", () => {
  it("rejects empty, non-text and oversized submissions", () => {
    for (const input of ["   ", null, {}, "a".repeat(12001)])
      expect(() => validateIdeaDescription(input)).toThrow();
    expect(validateIdeaDescription("  A planner for gardeners.  ")).toBe(
      "A planner for gardeners."
    );
  });
  it("accepts incomplete descriptions without inventing missing details", () => {
    const product = productFromIdea("A planner for gardeners.", {
      sell: "A planner for gardeners.",
    });
    expect(product).toMatchObject({
      name: "My idea",
      url: "",
      sell: "A planner for gardeners.",
      price: "",
      competitors: "",
      different: "",
      model: undefined,
      stage: "Idea",
      siteText: "A planner for gardeners.",
    });
  });
  it("ignores malformed optional fields and validates business model", () => {
    const product = productFromIdea("An idea", {
      sell: "A product",
      name: 42,
      price: { amount: 30 },
      competitors: ["Made up"],
      model: "unknown",
    });
    expect(product.name).toBe("My idea");
    expect(product.price).toBe("");
    expect(product.competitors).toBe("");
    expect(product.model).toBeUndefined();
    expect(productFromIdea("An idea", { sell: "A product", model: "b2b" }).model).toBe("B2B");
  });
  it("rejects unusable AI output so the user can retry without losing the description", () => {
    for (const output of [null, [], "question?", {}, { sell: 42 }])
      expect(() => productFromIdea("My idea", output)).toThrow();
  });
});
