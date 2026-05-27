// SPDX-License-Identifier: MIT

import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "icpfinder — find your ICP in 30 seconds",
  description:
    "Paste your product idea. Stream three buyer archetypes + 15 lookalike companies with verified contact emails. Open source, MIT, self-host.",
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
      </head>
      <body className="flex min-h-screen flex-col">{children}</body>
    </html>
  );
}
