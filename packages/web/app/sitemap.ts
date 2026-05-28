// SPDX-License-Identifier: MIT

import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://icpfinder.dev";
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/find`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/roadmap`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
  ];
}
