// SPDX-License-Identifier: MIT
//
// Emails a company shows on its own website. Free and checked by the page
// itself, so it runs before any paid finder like Hunter.

const JUNK =
  /^(no-?reply|donotreply|mailer-daemon|postmaster|abuse|privacy|legal|security|dmca|gdpr|unsubscribe)@|@(example\.|sentry|wixpress|domain\.com|email\.com)|\.(png|jpe?g|gif|svg|webp)$/i;
const GENERIC = /^(founder|hello|hi|hey|contact|team|info|support|sales|help|mail|office)@/i;

/** Every email in raw HTML or text, from mailto links and plain text, de-duplicated. */
export const emailsIn = (html: string): string[] => {
  const out = new Set<string>();
  const text = html.replace(/&#64;|&#x40;|\[at\]|\(at\)/gi, "@");
  for (const m of text.matchAll(/[\w.+-]+@[\w-]+(?:\.[\w-]+)*\.[a-z]{2,}/gi)) {
    const e = m[0].toLowerCase().replace(/\.$/, "");
    if (!JUNK.test(e)) out.add(e);
  }
  return [...out];
};

/**
 * The best address to write to: the person's own address at the company,
 * then any address at the company domain (founder@, hello@ before support@),
 * then nothing. Addresses at other domains are never picked.
 */
export const pickEmail = (emails: string[], domain: string, person?: string): string | null => {
  const host = domain.replace(/^www\./, "").toLowerCase();
  const own = emails.filter((e) => e.endsWith(`@${host}`) || e.endsWith(`.${host}`));
  const first = person?.split(/\s+/)[0]?.toLowerCase();
  const rank = (e: string) => {
    const local = e.split("@")[0] ?? "";
    if (first && first.length > 1 && local.includes(first)) return 0;
    if (GENERIC.test(e)) return /^(support|help|info|mail|office)@/.test(e) ? 3 : 2;
    return 1;
  };
  return own.sort((a, b) => rank(a) - rank(b))[0] ?? null;
};
