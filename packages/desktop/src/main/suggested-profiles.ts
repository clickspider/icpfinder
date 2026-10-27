import type { Icp, Product } from "../shared/types";
import { customIcp } from "./custom-icp";

/** Icons the results cards can draw; the AI picks one per group. */
export const PROFILE_ICONS = [
  "shop",
  "cart",
  "phone",
  "chat",
  "code",
  "people",
  "briefcase",
  "building",
  "home",
  "heart",
  "school",
  "megaphone",
  "wrench",
  "money",
];

export const PROFILE_GUIDANCE = `CRITICAL: Suggest 1 to 3 customer groups worth exploring for the user's reviewed business. Fewer, sharper groups beat padding: never add a group just to reach three.
WHAT MAKES A GROUP NEW: a different buyer, a different reason to buy, or a different message. Groups that are the same buyer with the same reason to buy, differing only in WHY NOW (about to launch, already tried a tool, priced out of an alternative), are ONE group: write one profile and put those why-now moments in its signal, separated by "; ". These are hypotheses, NOT researched companies, named contacts, confirmed intent, or guaranteed buyers. No web research or example companies.
Each profile must earn its place: connect a specific need of this group to the user's actual offer. Do not repeat the same generic benefit on every card. Never invent product capabilities or pricing. Use saved corrections, the user's audience and business progress. Progress describes the seller, not the buyers.
For Businesses use relevant company characteristics and professional roles. For Consumers use relevant life circumstances, interests, needs or household characteristics, and the person making the decision; do not force company size or job titles. For Both include business and consumer groups when both are supported.
WHY WE PICKED IT: max 14 words, written to the user ("you"). Name the one thing they shared that points to this group. Prefer a concrete detail from their own description of the offer or problem; use their audience or business progress only when that is truly the reason. Never just echo a setting they chose (not "You chose Businesses" or "You confirmed businesses are included"). Pattern: "You said <their detail>." Each profile needs a different reason; if two groups come from the same detail, name what else they shared that sets this group apart. Do NOT restate the offer, the benefit or the group name. Never mention methods, research or sources, and never claim a company, contact or buying signal was found.
PLAIN, CORRECT ENGLISH: write the way a person talks. No jargon or invented labels (write "people who avoid new apps", never "app-avoidant users"). When you mention the user's business progress, use these phrases: "You're at the idea stage", "You're preparing to launch", "You're looking for your first customers", "You already serve customers".
PEOPLE FIRST: "buyer" is the headline of the card. Write it as ONE person in a recognizable moment, in the form "A/An <who> who <what just happened to them>", max 16 words (for example "A solo founder who shipped last month and has no paying users yet"). Never a bare role ("The founder handling all business functions"). "title" stays a short group name (max 6 words, e.g. "Solo SaaS founders"), never the person sentence. "where" lists 2-4 specific, named places these people post or read today: a real subreddit ("r/SaaS"), "Show HN", "Product Hunt", "Indie Hackers", "X", "LinkedIn", or another community by its real name. Never a vague place ("startup communities", "Slack groups", "forums"); fewer is better than vague.
WHO TO TALK TO must name a concrete, recognizable person with a role or life situation (for example "the owner who answers customer messages" or "a busy parent who runs family life from their phone"). Never write "the individual", "the user" or "the person managing their own account".
NO REPETITION ACROSS FIELDS: each field adds something new. The tag lists traits that are NOT already in the title. The fit says what gets easier for this group in their own terms; do not repeat the product name or the user's offer word for word. Keep every field short and plain.
A signal is a situation to LOOK FOR LATER, never an event you claim has already happened at a named company. A fit concern is a reason for judgment, NOT an automatic exclusion or hard filter.
Output strict JSON {"profiles":[{"kind":"business or consumer","title":"recognizable customer group","tag":"relevant characteristics","fit":"one differentiated sentence about how this group could benefit","buyer":"who to talk to / relevant role or person","signal":"a possible situation to look for","skip":"a meaningful fit concern","why":"what you shared that points to this group","where":["2-4 places these people talk"],"icon":"one of: shop, cart, phone, chat, code, people, briefcase, building, home, heart, school, megaphone, wrench, money - the one that best shows who this group is"}]}. Every text field must be nonempty and at most 240 characters. No company names, contact names, URLs or exampleCompanies fields.`;

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
    if (typeof entry.icon === "string" && PROFILE_ICONS.includes(entry.icon)) icp.icon = entry.icon;
    // Where they talk: optional, short names only, never more than 4.
    if (Array.isArray(entry.where))
      icp.where = entry.where
        .filter(
          (w: unknown): w is string =>
            typeof w === "string" && w.trim().length > 0 && w.length <= 40
        )
        .map((w: string) => w.trim())
        .slice(0, 4);
    const key = icp.name.toLowerCase();
    if (seen.has(key)) throw new Error("The suggestions repeated a profile. Please try again.");
    seen.add(key);
    if (icp.card)
      for (const key of ["buyer", "company", "trigger", "skip"] as const)
        icp.card[key].source = "suggested profile";
    return icp;
  });
}
