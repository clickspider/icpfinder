// SPDX-License-Identifier: MIT
//
// Daniel's Invite click on /next/admin: send the "You're in" email, then
// mark the application invited. One click per person, never automatic.

import { type NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, sessionEmail } from "@/lib/admin-auth";
import { findApplication, markInvited } from "@/lib/applications";
import { invitedEmail, sendEmail } from "@/lib/beta-email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!sessionEmail(req.cookies.get(SESSION_COOKIE)?.value))
    return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  const { id } = ((await req.json().catch(() => ({}))) ?? {}) as { id?: string };
  const app = typeof id === "string" ? await findApplication(id) : null;
  if (!app) return NextResponse.json({ error: "Application not found." }, { status: 404 });
  if (app.invitedAt) return NextResponse.json({ invitedAt: app.invitedAt });
  if (!(await sendEmail(app.email, invitedEmail(app.name))))
    return NextResponse.json(
      { error: "The email did not go out. Nothing changed." },
      { status: 502 }
    );
  const row = await markInvited(app.id);
  return NextResponse.json({ invitedAt: row?.invitedAt });
}
