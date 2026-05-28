// SPDX-License-Identifier: MIT
//
// Outreach template — pure function that renders a 2-line cold opener from
// a candidate + archetype. Used by /api/outreach as the operator-mode path
// (no LLM call needed) and as the BYOK fallback when the LLM refuses.

interface OutreachInput {
  firstName: string | null;
  companyName: string;
  archetypeRole: string;
  sellingAngle?: string;
  whyNow?: string;
}

export function renderOutreachTemplate(input: OutreachInput): string {
  const opener = input.firstName
    ? `Hi ${input.firstName} —`
    : `Hi ${input.companyName} team —`;
  const reason =
    input.whyNow?.trim() ||
    `noticed ${input.companyName} fits the ${input.archetypeRole.toLowerCase()} pattern we usually help.`;
  const ask =
    input.sellingAngle?.trim() || "Worth a quick 15-min call to see if we'd be a fit?";
  return `${opener} ${reason}\n\n${ask}`;
}
