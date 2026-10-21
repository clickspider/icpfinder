import type { Icp, Product } from "../shared/types";
import { customIcp } from "./custom-icp";

export const PROFILE_GUIDANCE = `CRITICAL: Suggest three distinct customer groups worth exploring for the user's reviewed business. These are hypotheses, NOT researched companies, named contacts, confirmed intent, or guaranteed buyers. No web research or example companies.
Each profile must earn its place: connect a specific need of this group to the user's actual offer. Do not repeat the same generic benefit on every card. Never invent product capabilities or pricing. Use saved corrections, the user's audience and business progress. Progress describes the seller, not the buyers.
For Businesses use relevant company characteristics and professional roles. For Consumers use relevant life circumstances, interests, needs or household characteristics, and the person making the decision; do not force company size or job titles. For Both include business and consumer groups when both are supported.
WHY WE PICKED IT: max 14 words, written to the user ("you"). Name only the one thing they shared (their own words, audience or business progress) that points to this group, e.g. "You said it helps with anything on WhatsApp." Do NOT restate the offer, the benefit or the group name. Never mention methods, research or sources, and never claim a company, contact or buying signal was found.
NO REPETITION ACROSS FIELDS: each field adds something new. The tag lists traits that are NOT already in the title. The fit says what gets easier for this group in their own terms; do not repeat the product name or the user's offer word for word. Keep every field short and plain.
A signal is a situation to LOOK FOR LATER, never an event you claim has already happened at a named company. A fit concern is a reason for judgment, NOT an automatic exclusion or hard filter.
Output strict JSON {"profiles":[{"kind":"business or consumer","title":"recognizable customer group","tag":"relevant characteristics","fit":"one differentiated sentence about how this group could benefit","buyer":"who to talk to / relevant role or person","signal":"a possible situation to look for","skip":"a meaningful fit concern","why":"what you shared that points to this group"}]}. Every text field must be nonempty and at most 240 characters. No company names, contact names, URLs or exampleCompanies fields.`;

export function parseSuggestedProfiles(value: unknown, product: Product): Icp[] {
  const profiles =
    value && typeof value === "object" ? (value as { profiles?: unknown }).profiles : null;
  if (!Array.isArray(profiles) || profiles.length < 1 || profiles.length > 5)
    throw new Error("Couldn’t prepare customer profiles. Please try again.");
  const seen = new Set<string>();
  return profiles.map((entry, index) => {
    if (!entry || typeof entry !== "object" || !["business", "consumer"].includes(entry.kind))
      throw new Error("Couldn’t prepare customer profiles. Please try again.");
    if (
      (product.audience === "Consumers" && entry.kind !== "consumer") ||
      (product.audience === "Businesses" && entry.kind !== "business")
    )
      throw new Error("The suggested profiles did not match your audience. Please try again.");
    const icp = customIcp(entry, index, entry.kind);
    // "Why we picked it": optional, so one weak sentence never fails the whole set.
    if (typeof entry.why === "string" && entry.why.trim() && entry.why.length <= 140)
      icp.reasoning = entry.why.trim();
    const key = icp.name.toLowerCase();
    if (seen.has(key)) throw new Error("The suggestions repeated a profile. Please try again.");
    seen.add(key);
    if (icp.card)
      for (const key of ["buyer", "company", "trigger", "skip"] as const)
        icp.card[key].source = "suggested profile";
    return icp;
  });
}
