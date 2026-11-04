// SPDX-License-Identifier: MIT
//
// Answer choices for the /next beta form. Shared by the form, the server and admin.

/** The tools a beta applicant uses today. Key = logo file in public/next/tools. */
export const TOOLS = {
  gmail: "Gmail",
  hubspot: "HubSpot",
  apollo: "Apollo",
  clay: "Clay",
  hunter: "Hunter",
  pipedrive: "Pipedrive",
  googlesheets: "Sheets",
  linkedin: "LinkedIn",
  instantly: "Instantly",
  notion: "Notion",
  calendly: "Calendly",
  other: "Other",
} as const;
export type ToolId = keyof typeof TOOLS;

/** Mailbox providers: an address there tells us nothing about their business. */
const PERSONAL = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "yahoo.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "gmx.com",
  "gmx.net",
]);
export const isWorkEmail = (email: string) => !PERSONAL.has(email.split("@")[1] ?? "");

/** Answers of the first form (Oct 2026). Only shown for older applications in admin. */
export const OPTIONS = {
  role: {
    founder: "Founder or co-founder",
    solo: "Solo maker / indie hacker",
    employee: "I work at a company",
    agency: "Agency or freelancer",
    other: "Investor, student or other",
  },
  salesTeam: {
    none: "No one. I sell it myself",
    small: "1 or 2 people",
    team: "A real sales team",
  },
  stage: {
    idea: "Still an idea",
    live: "Live, no paying customers yet",
    paying: "Paying customers",
    scaling: "$10k+ MRR",
  },
  years: {
    lt1: "Less than a year",
    y1to3: "1 to 3 years",
    gt3: "More than 3 years",
  },
  agent: {
    daily: "Yes, every day",
    sometimes: "Sometimes",
    no: "Not yet",
  },
} as const;
