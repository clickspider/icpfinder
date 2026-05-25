// SPDX-License-Identifier: MIT

import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "icpfinder — find your ICP in 30 seconds",
  description:
    "Paste your product idea. Stream three buyer archetypes + 15 lookalike companies with verified contact emails. Open source, MIT, self-host.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
