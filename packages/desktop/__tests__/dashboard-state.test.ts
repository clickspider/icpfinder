import { describe, expect, it } from "vitest";
import { customIcp } from "../src/main/custom-icp";
import { profileStatus } from "../src/renderer/src/dashboard-state";

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
