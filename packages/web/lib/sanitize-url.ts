// SPDX-License-Identifier: MIT
//
// Provenance URL sanitizer — protects /api/deepen + ArchetypeCard against
// LLM-emitted javascript:, data:, vbscript:, file: protocols. The renderer
// MUST call this before adding the URL to an <a href> or innerHTML.
//
// Returns null on any rejection so the caller can render an "unverified
// source" placeholder instead of an exploitable link.

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

export function sanitizeProvenanceUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (!ALLOWED_PROTOCOLS.has(url.protocol)) return null;
  // Reject embedded credentials — `https://user:pass@host` is a known
  // phishing pattern. Strip them outright.
  url.username = "";
  url.password = "";
  return url.toString();
}
