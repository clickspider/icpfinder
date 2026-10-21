import type { Icp, Stage } from "./types";

/** Accept common stage spellings without inventing a funding round. */
export function productStage(value: unknown, evidence = ""): Stage | undefined {
  const normalized =
    typeof value === "string"
      ? value
          .toLowerCase()
          .replace(/[\s_-]+/g, "")
          .trim()
      : "";
  if (normalized === "idea") return "Idea";
  if (normalized === "preseed") return "Pre-seed";
  if (normalized === "seed") return "Seed";
  if (/^series[a-z]\+?$/.test(normalized)) return "Series A+";
  if (
    /\b(?:we(?:’|')?ve|we have|we|our company)\s+(?:just\s+)?(?:raised|closed|secured)\b[^.!?]{0,70}\bpre[- ]seed\b/i.test(
      evidence
    )
  )
    return "Pre-seed";
  if (
    /\b(?:we(?:’|')?ve|we have|we|our company)\s+(?:just\s+)?(?:raised|closed|secured)\b[^.!?]{0,70}\bseed\b/i.test(
      evidence
    )
  )
    return "Seed";
  if (
    /\b(?:we(?:’|')?ve|we have|we|our company)\s+(?:just\s+)?(?:raised|closed|secured)\b[^.!?]{0,70}\bseries [a-z]\b/i.test(
      evidence
    )
  )
    return "Series A+";
  return undefined;
}

/** Generated text can start lowercase or miss its full stop; show it as a sentence. */
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const sentence = (t: string) => {
  const v = t.trim();
  return v ? cap(/[.!?…]$/.test(v) ? v : `${v}.`) : v;
};

export function icpPresentation(icp: Icp) {
  if (icp.profileKind)
    return {
      id: icp.id,
      title: icp.name,
      tag: cap(icp.characteristics || "Customer profile"),
      buyer: cap(icp.card?.buyer.text || icp.name),
      fit: sentence(icp.sellingAngle || icp.pain),
      signal: cap(icp.card?.trigger.text || icp.signals[0] || "To be refined"),
      skip: cap(icp.card?.skip.text || "To be refined"),
      why: sentence(icp.reasoning ?? ""),
    };
  const company = icp.card?.company.text || [icp.industry, icp.size].filter(Boolean).join(" · ");
  const buyer = icp.card?.buyer.text || icp.name;
  const size =
    company.match(
      /\b\d+[–—-]\d+\s*(?:people|employees|staff|team members)\b|\b\d+\+?\s*(?:people|employees|staff|team members)\b/i
    )?.[0] || icp.size;
  const companyType = company
    .replace(size, "")
    .replace(/^[\s,·|–—-]+|[\s,·|–—-]+$/g, "")
    .trim();
  const same = (a: string, b: string) =>
    a.toLowerCase().replace(/[^a-z0-9]/g, "") === b.toLowerCase().replace(/[^a-z0-9]/g, "");
  const title =
    companyType && !same(companyType, buyer) ? companyType : icp.industry || "Customer profile";
  return {
    id: icp.id,
    title,
    tag: size || "Company profile",
    buyer,
    fit: icp.sellingAngle || icp.pain,
    signal: icp.card?.trigger.text || icp.criteria?.signals[0] || icp.signals[0] || "To be refined",
    skip: icp.card?.skip.text || icp.criteria?.dealBreakers[0] || "To be refined",
    why: icp.reasoning ?? "",
  };
}
