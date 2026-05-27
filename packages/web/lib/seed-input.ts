// SPDX-License-Identifier: MIT
//
// Pure helpers for classifying seed input (free-text vs URL). Safe to import
// from both client and server.

const URL_PROTOCOL_RE = /^https?:\/\//i;
const BARE_DOMAIN_RE =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}(?:\/[^\s]*)?$/i;

export type SeedKind = "text" | "url";

export interface ClassifiedSeed {
  kind: SeedKind;
  /** The seed as the user typed it (trimmed). */
  raw: string;
  /** A canonical URL string with explicit protocol, only set when kind === "url". */
  url?: string;
}

/**
 * Classify a raw input string as either free text or a single URL. A URL is
 * recognized when the trimmed input is one token AND either starts with
 * http(s):// or matches the bare-domain pattern (eg. acme.com, sub.acme.co/path).
 *
 * Free-text wins on any input with multiple words.
 */
export function classifySeed(raw: string): ClassifiedSeed {
  const trimmed = raw.trim();
  if (!trimmed) return { kind: "text", raw: trimmed };

  // Multi-token input is treated as free text even if it contains a URL —
  // the user is describing an idea, not asking for a scan.
  if (/\s/.test(trimmed)) return { kind: "text", raw: trimmed };

  if (URL_PROTOCOL_RE.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      return { kind: "url", raw: trimmed, url: url.toString() };
    } catch {
      return { kind: "text", raw: trimmed };
    }
  }

  if (BARE_DOMAIN_RE.test(trimmed)) {
    try {
      const url = new URL(`https://${trimmed}`);
      return { kind: "url", raw: trimmed, url: url.toString() };
    } catch {
      return { kind: "text", raw: trimmed };
    }
  }

  return { kind: "text", raw: trimmed };
}

/**
 * Extract a short label for the URL (host without `www.`). Returns the raw
 * input if it can't be parsed as a URL.
 */
export function shortUrlLabel(raw: string): string {
  const trimmed = raw.trim();
  try {
    const url = new URL(URL_PROTOCOL_RE.test(trimmed) ? trimmed : `https://${trimmed}`);
    return url.host.replace(/^www\./, "");
  } catch {
    return trimmed;
  }
}
