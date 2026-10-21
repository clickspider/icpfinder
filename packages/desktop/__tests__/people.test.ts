// SPDX-License-Identifier: MIT

import { describe, expect, it } from "vitest";
import { linkedinFor, peopleAt, peopleInIcp, rolesOf } from "../src/shared/people";

const p = (position: string) => ({ name: "A B", company: "X", position });

describe("people in an ICP", () => {
  it("reads the roles from the ICP name", () => {
    expect(rolesOf({ name: "Solo Founder" })).toContain("founder");
    expect(rolesOf({ name: "Founder or Head of Growth" })).toEqual(
      expect.arrayContaining(["founder", "head of growth"])
    );
  });
  it("matches titles, co-founders and plurals, not loose words", () => {
    const people = [
      p("Co-Founder & CEO"),
      p("Head of Programs"),
      p("Founders Associate"),
      p("Software Engineer"),
    ];
    expect(peopleInIcp(people, { name: "Founder" }).map((x) => x.person.position)).toEqual([
      "Co-Founder & CEO",
    ]);
    expect(peopleInIcp(people, { name: "Head of Programs" })).toHaveLength(1);
  });
});

describe("company facts decide", () => {
  const people = [
    { name: "Solo", company: "TinyCo", position: "Founder" },
    { name: "Big", company: "BigCo", position: "Founder & CEO" },
    { name: "New", company: "Unknown Ltd", position: "Founder" },
  ];
  const icp = {
    name: "Solo Founder",
    people: { roles: ["founder"], exclude: [], industries: ["Developer tools"], maxSize: 3 },
  };
  const facts = {
    tinyco: { industry: "Developer tools", size: 2 },
    bigco: { industry: "Developer tools", size: 400 },
  };
  it("keeps the solo founder, drops the big company, marks the unknown as maybe", () => {
    const r = peopleInIcp(people, icp, facts);
    expect(r.map((m) => [m.person.name, m.fit])).toEqual([
      ["Solo", "fits"],
      ["New", "maybe"],
    ]);
  });
  it("finds people at a company in one lookup", () => {
    expect(peopleAt(people, { name: "TinyCo", domain: "tinyco.dev" })).toHaveLength(1);
  });
});

describe("linkedinFor", () => {
  const finding = (profileUrl?: string) => ({ person: { name: "Ada", profileUrl } });
  it("opens a proven profile, never a search", () => {
    expect(
      linkedinFor({
        research: {
          findings: [finding("https://x.com/ada"), finding("http://linkedin.com/in/ada")],
        },
      })
    ).toEqual({ url: "https://linkedin.com/in/ada", who: "Ada" });
    expect(
      linkedinFor({
        research: {
          findings: [finding("https://www.linkedin.com/search/results/all/?keywords=ada")],
        },
      })
    ).toBeNull();
  });
  it("prefers the founder's own saved link", () => {
    expect(
      linkedinFor({
        linkedin: "https://www.linkedin.com/company/acme",
        research: { findings: [finding("https://www.linkedin.com/in/ada")] },
      })
    ).toEqual({ url: "https://www.linkedin.com/company/acme" });
  });
});
