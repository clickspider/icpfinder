// SPDX-License-Identifier: MIT
//
// Branded beta emails for /next, sent with Resend's HTTP API (no SDK).
// Without RESEND_API_KEY (local dev) the email is logged and written to
// .data/last-email.html so it can be opened in a browser.

import { mkdir, writeFile } from "node:fs/promises";
import { SITE_URL } from "./site";

const FROM = process.env.BETA_EMAIL_FROM || "Daniel from IcpFinder <daniel@icpfinder.dev>";
const REPLY_TO = process.env.BETA_EMAIL_REPLY_TO || undefined;

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c
  );

/** One card on cream, the logo on top: the Mac app look in email-safe HTML. */
export function layout(
  title: string,
  paragraphs: string[],
  button?: { label: string; href: string }
): string {
  const body = paragraphs
    .map((p) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#3c3c43">${p}</p>`)
    .join("");
  const cta = button
    ? `<a href="${button.href}" style="display:inline-block;margin:8px 0 4px;padding:13px 22px;border-radius:12px;background:#111114;color:#ffffff;font-weight:600;font-size:15px;text-decoration:none">${esc(button.label)}</a>`
    : "";
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head><body style="margin:0;padding:0;background:#f7f5f0">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f5f0;padding:40px 16px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
<tr><td style="padding:0 0 20px"><img src="${SITE_URL}/next/logo.png" width="44" height="44" alt="IcpFinder" style="display:block;border-radius:12px"></td></tr>
<tr><td style="background:#ffffff;border-radius:20px;padding:32px 28px;box-shadow:0 1px 2px rgba(0,0,0,0.04),0 12px 40px rgba(40,10,20,0.06);font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',Arial,sans-serif">
<div style="height:4px;width:56px;border-radius:4px;background:linear-gradient(90deg,#ff3d63,#ff8a5c);margin:0 0 22px"></div>
<h1 style="margin:0 0 18px;font-size:24px;line-height:1.2;letter-spacing:-0.02em;color:#111114">${esc(title)}</h1>
${body}${cta}
</td></tr>
<tr><td style="padding:20px 8px 0;font-family:-apple-system,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:#8a8a8e">
IcpFinder · open source (MIT) · <a href="${SITE_URL}/next" style="color:#8a8a8e">icpfinder.dev/next</a><br>You get this because you applied for the IcpFinder beta. Reply to this email to reach Daniel.
</td></tr>
</table></td></tr></table></body></html>`;
}

export function appliedEmail(name: string) {
  const first = esc(name.split(" ")[0] ?? name);
  return {
    subject: "We got your IcpFinder beta application",
    html: layout("Your application is in.", [
      `Hi ${first}, thanks for applying to the IcpFinder beta.`,
      "We let people in in small groups, and we read every application by hand. Founders who sell their live product themselves go first.",
      "If you are in, you get a second email with the Mac app and a short setup. It runs on the Claude Code or Codex you already have.",
      "Daniel",
    ]),
  };
}

export function adminCodeEmail(code: string) {
  return {
    subject: `IcpFinder admin code: ${code}`,
    html: layout("Your sign-in code", [
      "Use this code to open icpfinder.dev/next/admin:",
      `<span style="font-family:ui-monospace,Menlo,monospace;font-size:30px;letter-spacing:6px;font-weight:700;color:#111114">${code}</span>`,
      "It works for 10 minutes. If you did not ask for it, ignore this email.",
    ]),
  };
}

export function invitedEmail(name: string) {
  const first = esc(name.split(" ")[0] ?? name);
  return {
    subject: "You're in: the IcpFinder beta",
    html: layout(
      "You're in.",
      [
        `Hi ${first}, you are in the first group of the IcpFinder beta.`,
        "IcpFinder is a Mac app. It reads your product, picks who to sell to, hunts real companies with proof, and writes the first message. It runs on your own Claude Code or Codex, so there is no extra cost.",
        "Reply to this email with the Mac you use and whether you have Claude Code or Codex. I send you the build and stay with you for the first run.",
        "Daniel",
      ],
      { label: "See what it does", href: `${SITE_URL}/next` }
    ),
  };
}

/** Sends one email. Returns false when the provider refused it. */
export async function sendEmail(
  to: string,
  mail: { subject: string; html: string }
): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`[beta-email] (no RESEND_API_KEY) to=${to} subject="${mail.subject}"`);
    await mkdir(".data", { recursive: true });
    await writeFile(".data/last-email.html", mail.html);
    return true;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: FROM,
      to: [to],
      reply_to: REPLY_TO,
      subject: mail.subject,
      html: mail.html,
    }),
  });
  if (!res.ok)
    console.error("[beta-email] resend refused", res.status, await res.text().catch(() => ""));
  return res.ok;
}
