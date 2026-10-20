// SPDX-License-Identifier: MIT
//
// /api/apply — beta application from /next. Honeypot field `company`
// must stay empty; bots that fill it get a fake success.

import { type NextRequest, NextResponse } from "next/server";
import { parseApplication, saveApplication } from "@/lib/applications";
import { appliedEmail, sendEmail } from "@/lib/beta-email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  if (typeof body.company === "string" && body.company) return NextResponse.json({ tier: "later" });
  const input = parseApplication(body);
  if (typeof input === "string") return NextResponse.json({ error: input }, { status: 400 });
  try {
    const tier = await saveApplication(input);
    // The application is saved either way; a failed email is only logged.
    await sendEmail(input.email, appliedEmail(input.name)).catch((err) =>
      console.error("[apply] email", err)
    );
    return NextResponse.json({ tier });
  } catch (err) {
    console.error("[apply] save failed", err);
    return NextResponse.json({ error: "Could not save. Try again in a minute." }, { status: 500 });
  }
}
