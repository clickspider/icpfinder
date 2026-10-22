import type { EvidenceCheck, Finding } from "@icpfinder/core";
export const findingLabel = (status: Finding["status"]) =>
  status === "proven"
    ? "Supported"
    : status === "weak"
      ? "Needs checking"
      : "Not supported by this check";
export const evidenceLabel: Record<EvidenceCheck, string> = {
  verified: "Quote found on page",
  quote_not_found: "Quote not found on page",
  fetch_failed: "Couldn’t read the page",
  login_wall: "Page requires sign-in",
  no_quote: "No quote provided",
};
export function findingReason(why?: string): string {
  if (!why) return "";
  const reasons: Record<string, string> = {
    "no quote found on any cited page": "We couldn’t find the quoted text on the cited pages.",
    "event has no date": "The event date is missing.",
    "event date unreadable": "We couldn’t determine the event date.",
    "date is in the future": "The event date is in the future.",
    "date not shown on a verified page": "We couldn’t confirm the date on a checked page.",
    "only one page backs this": "Only one page supports this finding.",
    "only one independent source": "We found support on only one website.",
  };
  return (
    reasons[why] ??
    (/^older than \d+ days$/.test(why) ? "The event is outside the recent-signal window." : why)
  );
}
