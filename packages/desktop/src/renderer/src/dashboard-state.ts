import { scoringOf } from "../../shared/scoring";
import type { Company, Icp, Workspace } from "../../shared/types";

export function profileStatus(icp: Icp, ws: Pick<Workspace, "scoring">): string {
  if (icp.profileKind === "consumer") return "Consumer profile";
  const matches = icp.companies.filter(
    (c) => (c.match ?? 0) >= scoringOf(ws.scoring).bar && c.approval !== "rejected"
  ).length;
  if (icp.sourcing) return matches ? `Searching… · ${matches} matches` : "Searching…";
  if (icp.companies.some((c) => c.status === "researching" || c.status === "queued"))
    return "Researching…";
  if (icp.lastHunt?.error) return "Search interrupted";
  if (!icp.hunted) return "Not searched yet";
  return matches ? `${matches} ${matches === 1 ? "match" : "matches"}` : "No matches found";
}

/** Rejected companies never reappear when a user reveals lower-scoring results. */
export function companyGroups(companies: Company[], threshold: number) {
  const available = companies
    .filter((c) => c.approval !== "rejected")
    .sort(
      (a, b) =>
        Number(b.approval === "approved") - Number(a.approval === "approved") ||
        (b.match ?? 0) - (a.match ?? 0)
    );
  return {
    matching: available.filter((c) => (c.match ?? 0) >= threshold),
    below: available.filter((c) => (c.match ?? 0) < threshold),
  };
}
