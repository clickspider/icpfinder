// SPDX-License-Identifier: MIT
//
// Pure helpers for classifying seed input (free-text vs URL). Safe to import
// from both client and server.
//
// `normalizeUrlCandidate` strips common paste cruft before classification:
//   - leading/trailing whitespace
//   - surrounding quotes ("..."), single quotes, parens, angle brackets
//   - trailing punctuation (`)`, `.`, `,`, `;`, `:`, `!`, `?`)
//   - lowercases the host (URL constructor handles IDN→punycode)
//
// Multi-token check fires AFTER normalize so quoted/parenthesized URLs
// classify as URL.

const URL_PROTOCOL_RE = /^https?:\/\//i;
const BARE_DOMAIN_RE =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}(?:\/[^\s]*)?$/i;

// Explicit numeric-host guards. The regex above happens to exclude pure
// IPv4 because the trailing TLD requires letters, but inputs like
// `192.168.1.app` (mixed) or `[::1]` literals would slip through into the
// scanner. Reject anything that looks like a literal IP / bracketed IPv6
// before classification — defense-in-depth alongside scan-url's SSRF guard.
const IPV4_HOST_RE = /^(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?(?:\/.*)?$/;
const IPV6_BRACKET_RE = /^\[[0-9a-f:]+\](?::\d+)?(?:\/.*)?$/i;

export type SeedKind = "text" | "url";

export interface ClassifiedSeed {
  kind: SeedKind;
  /** The seed as the user typed it (trimmed). */
  raw: string;
  /** A canonical URL string with explicit protocol, only set when kind === "url". */
  url?: string;
}

const STRIP_WRAPPERS_RE = /^[\s"'<(\[]+|[\s"'>)\]]+$/g;
const STRIP_TRAILING_PUNCT_RE = /[.,;:!?]+$/;

/**
 * Strip common paste cruft from a single-token input: surrounding quotes,
 * parens, brackets, angle brackets, trailing punctuation, and whitespace.
 * Lowercases the result so callers can feed it straight to the URL
 * constructor (which then handles IDN→punycode automatically).
 *
 * Idempotent on already-clean inputs.
 */
export function normalizeUrlCandidate(raw: string): string {
  let s = raw.trim();
  // Strip wrappers iteratively — `"(linear.app)"` → `(linear.app)` → `linear.app`.
  let prev = "";
  while (prev !== s) {
    prev = s;
    s = s.replace(STRIP_WRAPPERS_RE, "");
    s = s.replace(STRIP_TRAILING_PUNCT_RE, "");
  }
  return s.toLowerCase();
}

/**
 * Classify a raw input string as either free text or a single URL. A URL is
 * recognized when the trimmed+normalized input is one token AND either starts
 * with http(s):// or matches the bare-domain pattern (eg. acme.com,
 * sub.acme.co/path). Free-text wins on any input with multiple words.
 */
export function classifySeed(raw: string): ClassifiedSeed {
  const trimmed = raw.trim();
  if (!trimmed) return { kind: "text", raw: trimmed };

  // If the input is already multi-token by whitespace AFTER trim, it's text —
  // even if it contains a URL.
  if (/\s/.test(trimmed)) return { kind: "text", raw: trimmed };

  const normalized = normalizeUrlCandidate(trimmed);
  if (!normalized) return { kind: "text", raw: trimmed };
  // Re-check post-strip: if stripping wrappers introduced whitespace, fall back to text.
  if (/\s/.test(normalized)) return { kind: "text", raw: trimmed };

  if (URL_PROTOCOL_RE.test(normalized)) {
    try {
      const url = new URL(normalized);
      // Reject IP literals at the classify boundary — scan-url.ts also
      // refuses them, but stopping here avoids a needless server round-trip.
      if (IPV4_HOST_RE.test(url.host) || IPV6_BRACKET_RE.test(url.host)) {
        return { kind: "text", raw: trimmed };
      }
      return { kind: "url", raw: trimmed, url: url.toString() };
    } catch {
      return { kind: "text", raw: trimmed };
    }
  }

  if (IPV4_HOST_RE.test(normalized) || IPV6_BRACKET_RE.test(normalized)) {
    return { kind: "text", raw: trimmed };
  }

  if (BARE_DOMAIN_RE.test(normalized)) {
    try {
      const url = new URL(`https://${normalized}`);
      return { kind: "url", raw: trimmed, url: url.toString() };
    } catch {
      return { kind: "text", raw: trimmed };
    }
  }

  return { kind: "text", raw: trimmed };
}

/**
 * Extract a short label for the URL (host without `www.`). Returns the raw
 * input if it can't be parsed as a URL. The URL constructor converts IDN
 * hosts to punycode, so callers get the canonical (transport-safe) form.
 */
export function shortUrlLabel(raw: string): string {
  const normalized = normalizeUrlCandidate(raw.trim());
  try {
    const url = new URL(URL_PROTOCOL_RE.test(normalized) ? normalized : `https://${normalized}`);
    return url.host.replace(/^www\./, "");
  } catch {
    return raw.trim();
  }
}

/**
 * True iff the canonical host (punycode) differs from the user's raw input.
 * UI shows a `(you typed: münchen.de)` second line in that case so the user
 * recognizes their own paste post-IDN conversion.
 */
export function canonicalDiffersFromRaw(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  const normalized = normalizeUrlCandidate(trimmed);
  const canonical = shortUrlLabel(trimmed);
  // Compare against the raw host with www stripped, lowercase.
  const rawHost = normalized
    .replace(URL_PROTOCOL_RE, "")
    .replace(/^www\./, "")
    .replace(/[/?#].*$/, "");
  return canonical !== rawHost && canonical.length > 0;
}
