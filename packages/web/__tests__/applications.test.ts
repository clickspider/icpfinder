import { describe, expect, it } from "vitest";
import { parseApplication, scoreApplication } from "../lib/applications";

const base = {
  name: "Ada",
  email: "ADA@example.com",
  productUrl: "example.com",
  profileUrl: "github.com/ada",
  role: "founder",
  salesTeam: "none",
  stage: "paying",
  years: "gt3",
  agent: "daily",
  firstWeek:
    "Find 20 seed-stage B2B SaaS founders in Europe and write to them about our feedback calls.",
};

describe("beta applications", () => {
  it("puts a founder who sells it alone first", () => {
    const a = parseApplication(base);
    if (typeof a === "string") throw new Error(a);
    expect(a.email).toBe("ada@example.com");
    expect(scoreApplication(a).tier).toBe("priority");
  });
  it("puts idea-stage and sales-team applicants later", () => {
    for (const patch of [{ stage: "idea" }, { salesTeam: "team" }, { role: "agency" }]) {
      const a = parseApplication({ ...base, ...patch });
      if (typeof a === "string") throw new Error(a);
      expect(scoreApplication(a).tier).toBe("later");
    }
  });
  it("rejects missing answers and bad links", () => {
    expect(parseApplication({ ...base, role: "ceo" })).toBe("Answer every question.");
    expect(parseApplication({ ...base, productUrl: "nope" })).toBe(
      "Add the link to what you built."
    );
  });
});
