// SPDX-License-Identifier: MIT

import type { MetadataRoute } from "next";
import { AI_CRAWLERS } from "../lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },
      {
        userAgent: [...AI_CRAWLERS],
        allow: "/",
        disallow: ["/api/"],
      },
    ],
    sitemap: "https://icpfinder.dev/sitemap.xml",
    host: "https://icpfinder.dev",
  };
}
