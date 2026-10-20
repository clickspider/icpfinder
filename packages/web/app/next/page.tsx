// SPDX-License-Identifier: MIT

import type { Metadata } from "next";
import { NextLanding } from "../../components/next/NextLanding";
import "./next.css";

const TITLE = "IcpFinder for Mac — your go-to-market, open source";
const DESCRIPTION =
  "Private beta. IcpFinder finds who to sell to, hunts real companies with proof and writes the first message. Free and open source, on the Claude or Codex you already pay for.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/next" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/next" },
};

export default function NextPage() {
  return <NextLanding />;
}
