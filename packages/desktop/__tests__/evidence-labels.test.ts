import { expect, it } from "vitest";
import { evidenceLabel, findingLabel, findingReason } from "../src/shared/evidence-labels";

it("explains weak/stale evidence without equating every status to source counts", () => {
  expect(findingLabel("weak")).toBe("Needs checking");
  expect(findingReason("event has no date")).toBe("The event date is missing.");
  expect(findingReason("older than 90 days")).toBe(
    "The event is outside the recent-signal window."
  );
  expect(findingReason("only one independent source")).toBe(
    "We found support on only one website."
  );
  expect(evidenceLabel.verified).toBe("Quote found on page");
});
