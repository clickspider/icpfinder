import { describe, expect, it } from "vitest";
import { customIcp } from "../src/main/custom-icp";
import { productFromIdea } from "../src/main/idea";
import { icpPresentation, productStage } from "../src/shared/onboarding";

describe("onboarding presentation", () => {
  it("normalizes inferred stage labels and uses explicit first-party evidence", () => {
    expect(productStage("pre seed")).toBe("Pre-seed");
    expect(productStage("Series B")).toBe("Series A+");
    expect(productStage("", "We've raised a seed round.")).toBe("Seed");
    expect(productStage("", "Tools for seed-stage companies.")).toBeUndefined();
    expect(productStage("", "Pricing starts at $19.")).toBeUndefined();
    expect(productFromIdea("We raised a seed round.", { sell: "Invoicing" }).stage).toBe("Seed");
  });
  it("elevates company type and keeps role and headcount distinct", () => {
    const icp = customIcp(
      {
        title: "Founder",
        tag: "Early B2B SaaS · 1–10 people",
        buyer: "Founder",
        fit: "Less admin",
        signal: "New clients",
        skip: "Marketplace only",
      },
      0
    );
    expect(icpPresentation(icp)).toMatchObject({
      title: "Early B2B SaaS",
      tag: "1–10 people",
      buyer: "Founder",
    });
  });
  it("uses the industry when an old card duplicates the buyer in its company field", () => {
    const icp = customIcp(
      {
        title: "Founder",
        tag: "Founder",
        buyer: "Founder",
        fit: "Less admin",
        signal: "New clients",
        skip: "Marketplace only",
      },
      0
    );
    icp.industry = "Software studios";
    expect(icpPresentation(icp).title).toBe("Software studios");
  });
});
