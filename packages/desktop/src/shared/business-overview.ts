import type { Product } from "./types";

export const AUDIENCES = ["Businesses", "Consumers", "Both"] as const;
export const PROGRESS = [
  "Exploring an idea",
  "Preparing to launch",
  "Looking for first customers",
  "Already serving customers",
] as const;
export const OVERVIEW_FIELDS = [
  ["name", "Business name"],
  ["sell", "What you offer"],
  ["problem", "The problem you solve"],
  ["different", "What makes your business different"],
  ["competitors", "Alternatives customers use"],
] as const;
export function inferredBusiness(value: Record<string, unknown>) {
  return {
    audience: AUDIENCES.find((v) => v.toLowerCase() === String(value.audience ?? "").toLowerCase()),
    progress: PROGRESS.find((v) => v.toLowerCase() === String(value.progress ?? "").toLowerCase()),
    marketplace: typeof value.marketplace === "boolean" ? value.marketplace : undefined,
    confirmedFields: [],
  };
}
export const marketplaceOf = (p: Product): boolean | undefined =>
  p.marketplace ?? (p.model === "Marketplace" ? true : undefined);

/** This is the only overview sent to profile generation and subsequent research. */
export function sellerSummary(p: Product): string {
  const value = (key: string, label: string, text?: string) =>
    text
      ? `${label} (${p.confirmedFields?.includes(key) ? "confirmed by user" : "suggested; not confirmed"}): ${text}`
      : "";
  return [
    "The following describes the USER'S OWN BUSINESS, not the target customer's business. Current overview values take precedence over the original website/description. Do not restore removed details or infer business progress from funding. Unconfirmed suggestions are uncertain, not hard qualification constraints.",
    value("name", "Business name", p.name),
    value("sell", "What they offer", p.sell),
    value("problem", "Problem solved", p.problem),
    value("different", "Differentiation", p.different),
    value("competitors", "Alternatives", p.competitors),
    value("audience", "Who this business sells to", p.audience),
    value("progress", "This business's current progress", p.progress),
    value(
      "marketplace",
      "Business structure",
      marketplaceOf(p) === undefined
        ? undefined
        : marketplaceOf(p)
          ? "Marketplace connecting buyers and sellers"
          : "Not a marketplace"
    ),
    p.url && `Website: ${p.url}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export const BUSINESS_INFERENCE = `Describe the user's OWN business, never its target customers. Only suggest an audience or business progress when the supplied information supports it; otherwise use an empty string. Funding does not establish business progress. Audience must be Businesses, Consumers, Both or empty. Progress must be Exploring an idea, Preparing to launch, Looking for first customers, Already serving customers or empty. A website, a price, or a written description alone does not establish launch status or paying customers. Marketplace means this business connects buyers and sellers; use true or false only with evidence, otherwise null. Never infer these answers from the stage of customers served. Include JSON fields "audience", "progress", "marketplace". Do not output the legacy model or stage fields.`;
