// SPDX-License-Identifier: MIT

import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { MAKER, SITE_DESCRIPTION, SITE_NAME, SITE_URL, siteJsonLd } from "../lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "icpfinder — find your ICP in 30 seconds",
    template: "%s — icpfinder",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "ICP finder",
    "ideal customer profile",
    "find first customers",
    "customer discovery",
    "B2B lead list",
    "startup idea validation",
    "open source",
  ],
  authors: [{ name: MAKER.name, url: MAKER.url }],
  creator: MAKER.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: SITE_URL,
    title: "icpfinder — find your ICP in 30 seconds",
    description: SITE_DESCRIPTION,
  },
  twitter: { card: "summary_large_image" },
};

const modeBootstrap = `(function(){try{var m=localStorage.getItem('icpfinder.mode');if(m==='light'||m==='dark'){document.documentElement.setAttribute('data-mode',m);}else if(window.matchMedia('(prefers-color-scheme: dark)').matches){document.documentElement.setAttribute('data-mode','dark');}}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.bunny.net" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.bunny.net/css?family=hanken-grotesk:400,500,600,700|jetbrains-mono:400,500,600&display=swap"
        />
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: FOUC prevention requires inline script before paint.
          dangerouslySetInnerHTML={{ __html: modeBootstrap }}
        />
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD must be inline; content is static site facts.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd()) }}
        />
      </head>
      <body className="flex min-h-screen flex-col">
        {children}
        {/* Vercel Web Analytics. No-op when process.env.VERCEL_ENV is unset, */}
        {/* so self-hosters (non-Vercel deploys) get zero requests to */}
        {/* /_vercel/insights/*. See docs/telemetry.md. Pinned exact to 1.5.0 */}
        {/* in package.json because the self-host no-fire contract is */}
        {/* version-specific. Bumping requires re-verifying that contract. */}
        <Analytics />
      </body>
    </html>
  );
}
