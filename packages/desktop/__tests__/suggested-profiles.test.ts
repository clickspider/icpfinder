import { describe, expect, it } from "vitest";
import { productFromIdea } from "../src/main/idea";
import { PROFILE_GUIDANCE, parseSuggestedProfiles } from "../src/main/suggested-profiles";
import { icpPresentation } from "../src/shared/onboarding";

const entry = {
  kind: "consumer",
  title: "Weekend gardeners",
  tag: "Small outdoor spaces",
  fit: "Plan small beds without wasting seeds or space.",
  buyer: "The person planning the household garden",
  signal: "Planning a first growing season",
  skip: "May prefer spontaneous planting",
};
const p = productFromIdea("Garden planning", { sell: "A garden planner", audience: "Consumers" });
describe("suggested customer profiles", () => {
  it("preserves consumer characteristics, identity and advisory caveats without companies or exclusions", () => {
    const [icp] = parseSuggestedProfiles(
      { profiles: [{ ...entry, exampleCompanies: [{ name: "Invented" }] }] },
      p
    );
    if (!icp) throw new Error("Missing profile");
    expect(icpPresentation(icp)).toMatchObject({
      title: entry.title,
      tag: entry.tag,
      buyer: entry.buyer,
      skip: entry.skip,
      fit: entry.fit,
    });
    expect(icp?.companies).toEqual([]);
    expect(icp?.criteria).toBeUndefined();
    expect(icp?.hunted).toBe(false);
  });
  it("rejects wrong audiences, empty fields and duplicate profile names", () => {
    for (const profiles of [
      [{ ...entry, kind: "business" }],
      [{ ...entry, fit: "" }],
      [entry, entry],
      [],
    ])
      expect(() => parseSuggestedProfiles({ profiles }, p)).toThrow();
  });
  it("allows both kinds for a business that serves both audiences", () => {
    expect(
      parseSuggestedProfiles(
        { profiles: [entry, { ...entry, kind: "business", title: "Garden clubs" }] },
        { ...p, audience: "Both" }
      )
    ).toHaveLength(2);
  });
  it("keeps a short 'why we picked it' reason, and never fails the set without one", () => {
    const why = "You said you plan a garden with your family every spring.";
    const [withWhy, without] = parseSuggestedProfiles(
      {
        profiles: [
          { ...entry, why },
          { ...entry, title: "Balcony growers", why: "" },
        ],
      },
      p
    );
    expect(withWhy?.reasoning).toBe(why);
    expect(icpPresentation(withWhy as never).why).toBe(why);
    expect(without?.reasoning).toBeUndefined();
    expect(PROFILE_GUIDANCE).toContain("WHY WE PICKED IT");
    expect(PROFILE_GUIDANCE).toContain("Never mention methods");
    expect(PROFILE_GUIDANCE).toContain("NO REPETITION ACROSS FIELDS");
  });
  it("asks for differentiated hypotheses rather than research or exclusion rules", () => {
    expect(PROFILE_GUIDANCE).toContain("Do not repeat the same generic benefit");
    expect(PROFILE_GUIDANCE).toContain("LOOK FOR LATER");
    expect(PROFILE_GUIDANCE).toContain("NOT an automatic exclusion");
  });
});
