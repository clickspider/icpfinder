// SPDX-License-Identifier: MIT
//
// Answer choices for the /next beta form. Shared by the form and the server.

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
