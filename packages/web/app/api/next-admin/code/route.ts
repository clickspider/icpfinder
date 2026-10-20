// SPDX-License-Identifier: MIT
//
// Step 1 of /next/admin sign-in: email a code. Always answers "sent" so the
// page does not reveal which emails are admins.

import { type NextRequest, NextResponse } from "next/server";
import {
  adminConfigured,
  CHALLENGE_COOKIE,
  isAdminEmail,
  limited,
  newChallenge,
} from "@/lib/admin-auth";
import { adminCodeEmail, sendEmail } from "@/lib/beta-email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!adminConfigured())
    return NextResponse.json({ error: "Admin is not set up." }, { status: 503 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (limited(`code:${ip}`, 5))
    return NextResponse.json({ error: "Too many tries. Wait 15 minutes." }, { status: 429 });
  const { email } = ((await req.json().catch(() => ({}))) ?? {}) as { email?: string };
  const res = NextResponse.json({ sent: true });
  if (typeof email !== "string" || !isAdminEmail(email)) return res;
  const { code, cookie } = newChallenge(email.trim().toLowerCase());
  await sendEmail(email, adminCodeEmail(code));
  if (!process.env.RESEND_API_KEY) console.info(`[next-admin] dev code for ${email}: ${code}`);
  res.cookies.set(CHALLENGE_COOKIE, cookie, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: 600,
  });
  return res;
}
