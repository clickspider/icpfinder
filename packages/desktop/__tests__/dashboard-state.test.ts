import { describe, expect, it } from "vitest";
import { customIcp } from "../src/main/custom-icp";
import { companyGroups, profileStatus } from "../src/renderer/src/dashboard-state";
import type { Company } from "../src/shared/types";

const profile = () =>
  customIcp(
    {
      title: "Studios",
      tag: "Small teams",
      fit: "Less admin",
      buyer: "Owner",
      signal: "New clients",
      skip: "Marketplace billing",
    },
    0
  );
describe("dashboard profile status", () => {
  it("does not imply consumer company search is available", () => {
    const icp = profile();
    icp.profileKind = "consumer";
    expect(profileStatus(icp, {})).toBe("Consumer profile");
  });
  it("keeps searches distinct from idle and no matches", () => {
    const icp = profile();
    expect(profileStatus(icp, {})).toBe("Not searched yet");
    icp.hunted = true;
    expect(profileStatus(icp, {})).toBe("No matches found");
    icp.sourcing = true;
    expect(profileStatus(icp, {})).toBe("Searching…");
  });
});

describe("company result groups", () => {
  it("keeps the threshold inclusive and excludes rejected companies from both groups", () => {
    const companies: Company[] = [
      { name: "At threshold", domain: "at.test", status: "candidate", match: 70 },
      { name: "Lower", domain: "lower.test", status: "candidate", match: 69 },
      {
        name: "Rejected high",
        domain: "rh.test",
        status: "candidate",
        match: 90,
        approval: "rejected",
      },
      {
        name: "Rejected low",
        domain: "rl.test",
        status: "candidate",
        match: 20,
        approval: "rejected",
      },
    ];
    const groups = companyGroups(companies, 70);
    expect(groups.matching.map((c) => c.domain)).toEqual(["at.test"]);
    expect(groups.below.map((c) => c.domain)).toEqual(["lower.test"]);
    expect(companyGroups(companies, 60).matching).toHaveLength(2);
    expect(companies).toHaveLength(4);
  });
  it("ranks reachable companies first only when their match scores tie", () => {
    const companies: Company[] = [
      { name: "Tie", domain: "tie.test", status: "candidate", match: 80 },
      {
        name: "Reachable",
        domain: "reachable.test",
        status: "candidate",
        match: 80,
        linkedin: "https://www.linkedin.com/company/reachable",
      },
      { name: "Higher", domain: "higher.test", status: "candidate", match: 90 },
    ];
    expect(companyGroups(companies, 70).matching.map((c) => c.domain)).toEqual([
      "higher.test",
      "reachable.test",
      "tie.test",
    ]);
  });
  it("does not present an unscored company as a qualifying match", () => {
    const company: Company = { name: "Unscored", domain: "unknown.test", status: "candidate" };
    expect(companyGroups([company], 70)).toEqual({ matching: [], below: [company] });
  });
});
