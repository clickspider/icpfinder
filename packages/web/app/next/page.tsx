// SPDX-License-Identifier: MIT

import type { Metadata } from "next";
import { NextLanding } from "../../components/next/NextLanding";
import "./next.css";

const TITLE = "IcpFinder: a harness for go-to-market";
const DESCRIPTION =
  "One place for your go-to-market, the way coding agents are a harness for code. Open source, on your Mac, on the Claude, ChatGPT or Grok plan you already pay for. Small beta, one on one.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/next" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/next" },
};

export default function NextPage() {
  return <NextLanding />;
}
