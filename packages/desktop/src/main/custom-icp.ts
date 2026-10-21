import { randomUUID } from "node:crypto";
import type { Icp, IcpDraft, Product } from "../shared/types";

/** Preserve the founder's words; derive research checks only when they continue. */
export function customIcp(
  value: unknown,
  art: number,
  profileKind: "business" | "consumer" = "business"
): Icp {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Fill in your ICP details.");
  const draft = {} as IcpDraft;
  for (const key of ["title", "tag", "fit", "buyer", "signal", "skip"] as const) {
    const field = (value as Record<string, unknown>)[key];
    if (typeof field !== "string" || !field.trim() || field.length > 240)
      throw new Error("Fill in each ICP field, using up to 240 characters.");
    draft[key] = field.trim();
  }
  const line = (text: string) => ({ text, why: "", source: "you" });
  return {
    id: `icp_${randomUUID()}`,
    name: draft.title,
    profileKind,
    characteristics: draft.tag,
    industry: draft.tag,
    size: "",
    pain: draft.fit,
    sellingAngle: draft.fit,
    signals: [draft.signal],
    objections: [],
    art,
    hunted: false,
    companies: [],
    card: {
      buyer: line(draft.buyer),
      company: line(draft.tag),
      trigger: line(draft.signal),
      skip: line(draft.skip),
      edited: true,
    },
  };
}

export async function refineCustomIcps(
  product: Product,
  icps: Icp[],
  refine: (product: Product, icp: Icp) => Promise<Icp["criteria"] | null>
): Promise<void> {
  for (const icp of icps) {
    if (!icp.card?.edited) continue;
    const criteria = await refine(product, icp);
    if (!criteria?.mustHave.length || !criteria.signals.length || !criteria.dealBreakers.length)
      throw new Error(`Couldn’t refine ${icp.name}. Your details are saved. Please try again.`);
    icp.criteria = criteria;
    icp.card.edited = false;
  }
}
