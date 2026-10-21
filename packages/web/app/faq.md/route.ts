// SPDX-License-Identifier: MIT
//
// /faq.md — markdown mirror of /faq for AI agents.

import { faqMarkdown, markdownResponse } from "../../lib/markdown";

export const dynamic = "force-static";

export function GET() {
  return markdownResponse(faqMarkdown());
}
