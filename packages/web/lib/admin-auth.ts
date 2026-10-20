// SPDX-License-Identifier: MIT
//
// Email-code sign-in for /next/admin. Stateless: the code and the session
// are HMAC-signed cookies (ADMIN_SECRET), so no table is needed. Only
// addresses in ADMIN_EMAILS (comma-separated) can sign in.

import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

export const CHALLENGE_COOKIE = "nx_admin_challenge";
export const SESSION_COOKIE = "nx_admin";
const CODE_TTL_MS = 10 * 60_000;
export const SESSION_TTL_MS = 30 * 24 * 60 * 60_000;

const secret = () => process.env.ADMIN_SECRET ?? "";
export const adminEmails = () =>
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
export const isAdminEmail = (email: string) => adminEmails().includes(email.trim().toLowerCase());
export const adminConfigured = () => secret().length >= 32 && adminEmails().length > 0;

const sign = (data: string) => createHmac("sha256", secret()).update(data).digest("base64url");
const same = (a: string, b: string) =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** 8 digits: with a 10-minute window and a per-IP limit, guessing is not practical. */
export function newChallenge(email: string): { code: string; cookie: string } {
  const code = String(randomInt(0, 100_000_000)).padStart(8, "0");
  const exp = Date.now() + CODE_TTL_MS;
  const payload = `${email}|${exp}`;
  return {
    code,
    cookie: `${Buffer.from(payload).toString("base64url")}.${sign(`${payload}|${code}`)}`,
  };
}

/** Returns the email when the code matches the challenge cookie. */
export function checkChallenge(cookie: string | undefined, code: string): string | null {
  const [p, mac] = (cookie ?? "").split(".");
  if (!p || !mac || !secret()) return null;
  const payload = Buffer.from(p, "base64url").toString();
  const [email, exp] = payload.split("|");
  if (!email || Number(exp) < Date.now()) return null;
  return same(mac, sign(`${payload}|${code.replace(/\D/g, "")}`)) ? email : null;
}

export function newSession(email: string): string {
  const payload = `${email}|${Date.now() + SESSION_TTL_MS}`;
  return `${Buffer.from(payload).toString("base64url")}.${sign(`session|${payload}`)}`;
}

/** The signed-in admin email, or null. Re-checks ADMIN_EMAILS every time. */
export function sessionEmail(cookie: string | undefined): string | null {
  const [p, mac] = (cookie ?? "").split(".");
  if (!p || !mac || !secret()) return null;
  const payload = Buffer.from(p, "base64url").toString();
  const [email, exp] = payload.split("|");
  if (!email || Number(exp) < Date.now() || !isAdminEmail(email)) return null;
  return same(mac, sign(`session|${payload}`)) ? email : null;
}

// ponytail: per-instance memory limit; move to Upstash if abuse shows up.
const hits = new Map<string, number[]>();
export const limited = (key: string, max: number) => {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < 15 * 60_000);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > max;
};
