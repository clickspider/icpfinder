import { describe, expect, it } from "vitest";
import { parseApplication, scoreApplication } from "../lib/applications";

const base = {
  name: "Ada",
  email: "ADA@magpie.io",
  tools: ["hubspot", "apollo", "nope"],
  challenge: "Finding the right people to talk to before I run out of runway.",
};

describe("beta applications", () => {
  it("puts a work email with sales tools in use first", () => {
    const a = parseApplication(base);
    if (typeof a === "string") throw new Error(a);
    expect(a.email).toBe("ada@magpie.io");
    expect(a.tools).toEqual(["hubspot", "apollo"]);
    expect(scoreApplication(a)).toEqual({ score: 5, tier: "priority" });
  });
  it("orders a personal email with no tools later, without rejecting it", () => {
    const a = parseApplication({
      ...base,
      email: "ada@gmail.com",
      tools: ["other"],
      challenge: "leads",
    });
    if (typeof a === "string") throw new Error(a);
    expect(scoreApplication(a).tier).toBe("later");
  });
  it("asks for what is missing", () => {
    expect(parseApplication({ ...base, tools: [] })).toBe("Pick at least one tool.");
    expect(parseApplication({ ...base, challenge: "" })).toBe(
      "Tell us your biggest challenge, in a few words."
    );
    expect(parseApplication({ ...base, email: "ada" })).toBe("Add your work email.");
  });
});
