import { marketplaceOf, OVERVIEW_FIELDS } from "./business-overview";
import type { Product } from "./types";

/** Only reviewed fields are applied; source context and existing research stay intact. */
export function businessEditPatch(original: Product, draft: Product): Partial<Product> {
  const keys = [...OVERVIEW_FIELDS.map(([key]) => key), "audience", "progress"];
  const patch: Partial<Product> = {
    name: draft.name.trim(),
    sell: draft.sell.trim(),
    problem: draft.problem.trim(),
    different: draft.different.trim(),
    competitors: draft.competitors?.trim(),
    audience: draft.audience,
    progress: draft.progress,
    confirmedFields: [...new Set([...(original.confirmedFields ?? []), ...keys])],
  };
  if (marketplaceOf(original) === true || marketplaceOf(draft) === true) {
    patch.marketplace = marketplaceOf(draft);
    patch.model = undefined;
    patch.confirmedFields?.push("marketplace");
  }
  return patch;
}
