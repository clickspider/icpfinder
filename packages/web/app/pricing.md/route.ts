// SPDX-License-Identifier: MIT
//
// /pricing.md — markdown mirror of /pricing for AI agents.

import { markdownResponse, pricingMarkdown } from "../../lib/markdown";

export const dynamic = "force-static";

export function GET() {
  return markdownResponse(pricingMarkdown());
}
