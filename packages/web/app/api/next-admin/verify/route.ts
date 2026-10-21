// SPDX-License-Identifier: MIT

import { type NextRequest, NextResponse } from "next/server";
import {
  CHALLENGE_COOKIE,
  checkChallenge,
  limited,
  newSession,
  SESSION_COOKIE,
  SESSION_TTL_MS,
} from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (limited(`verify:${ip}`, 10))
    return NextResponse.json({ error: "Too many tries. Wait 15 minutes." }, { status: 429, headers: { "Retry-After": "900" } });
  const { code } = ((await req.json().catch(() => ({}))) ?? {}) as { code?: string };
  const email = checkChallenge(req.cookies.get(CHALLENGE_COOKIE)?.value, String(code ?? ""));
  if (!email)
    return NextResponse.json(
      { error: "That code does not match. Ask for a new one." },
      { status: 401 }
    );
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(CHALLENGE_COOKIE);
  res.cookies.set(SESSION_COOKIE, newSession(email), {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
  return res;
}
