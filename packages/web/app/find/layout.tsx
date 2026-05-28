// SPDX-License-Identifier: MIT

import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Run your ICP search",
  description:
    "Paste a product idea or URL. Stream three buyer archetypes plus verified contact emails. Free demo, bring your own keys for unlimited runs.",
  alternates: { canonical: "/find" },
};

export default function FindLayout({ children }: { children: ReactNode }) {
  return children;
}
