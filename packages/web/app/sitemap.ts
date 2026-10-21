// SPDX-License-Identifier: MIT

import type { MetadataRoute } from "next";
import { CONTENT_UPDATED, PRICING_UPDATED } from "../lib/content";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://icpfinder.dev";
  const now = new Date();
  const updated = new Date(`${CONTENT_UPDATED}T00:00:00Z`);
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/find`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/roadmap`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    {
      url: `${base}/guides/find-your-icp`,
      lastModified: updated,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${base}/guides/icp-vs-buyer-persona`,
      lastModified: updated,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${base}/alternatives`,
      lastModified: updated,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    { url: `${base}/faq`, lastModified: updated, changeFrequency: "monthly", priority: 0.7 },
    {
      url: `${base}/pricing`,
      lastModified: new Date(`${PRICING_UPDATED}T00:00:00Z`),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    { url: `${base}/llms.txt`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];
}
