import { scoringOf } from "../../shared/scoring";
import { timingOf } from "../../shared/timing";
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
  const reach = (c: Company) =>
    (c.warm?.length ? 2 : 0) +
    (c.linkedin ? 1 : 0) +
    (c.actions?.findEmail?.status === "done" ? 1 : 0);
  const available = companies
    .filter((c) => c.approval !== "rejected")
    .sort(
      (a, b) =>
        Number(b.approval === "approved") - Number(a.approval === "approved") ||
        // The new way: the freshest moment first, then someone you can reach, then fit.
        timingOf(a).rank - timingOf(b).rank ||
        Number(reach(b) >= 2) - Number(reach(a) >= 2) ||
        (b.match ?? 0) - (a.match ?? 0) ||
        reach(b) - reach(a)
    );
  return {
    matching: available.filter((c) => (c.match ?? 0) >= threshold),
    below: available.filter((c) => (c.match ?? 0) < threshold),
  };
}
