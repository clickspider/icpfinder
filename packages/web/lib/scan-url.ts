// SPDX-License-Identifier: MIT
//
// Server-only website scanner. Fetches a URL, extracts the title, meta
// description, and first ~4 KB of visible text, returns a compact summary
// suitable for prepending to the seed before handing to the LLM. Never throws —
// caller falls back to the raw seed on failure.
//
// SSRF defense:
//   - Resolves the hostname to an IP via node:dns and refuses loopback /
//     private / link-local / CGNAT / multicast / reserved addresses BEFORE
//     issuing the fetch. Blocks the classic cloud-metadata (169.254.169.254)
//     + localhost-port-scanning attack class.
//   - `redirect: "manual"` — a 3xx that would land at a private host is
//     refused outright rather than followed.
//   - Initial-resolution TOCTOU is still possible (attacker repoints DNS
//     between lookup + fetch). Acceptable v0.1 tradeoff; revisit by pinning
//     the resolved IP into the fetch (custom dispatcher) if abuse appears.

import { lookup } from "node:dns/promises";

const FETCH_TIMEOUT_MS = 6_000;
const MAX_BYTES = 750_000; // ~750 KB ceiling on response body
const MAX_TEXT_CHARS = 3_500;
const USER_AGENT =
  "icpfinder-scan/0.1 (+https://github.com/clickspider/icpfinder; reads <title>, meta description, and first visible text only)";

export interface ScanResult {
  url: string;
  host: string;
  title?: string;
  description?: string;
  /** First ~3.5K chars of visible page text, stripped + collapsed. */
  bodyText?: string;
}

export interface ScannedSeed {
  /** Enriched seed safe to feed to the LLM. */
  seed: string;
  /** Original raw input (the URL string). */
  rawUrl: string;
  scan?: ScanResult;
  error?: string;
}

/**
 * Returns true if the address sits inside a range the server should never
 * reach via user-supplied URLs (loopback, RFC1918, CGNAT, link-local,
 * cloud metadata, multicast, reserved, IPv6 loopback / unique-local /
 * link-local, ipv4-mapped variants).
 */
export function isPrivateIp(addr: string): boolean {
  // IPv4
  if (/^127\./.test(addr)) return true; // loopback
  if (/^10\./.test(addr)) return true; // private A
  if (/^192\.168\./.test(addr)) return true; // private C
  if (/^172\.(?:1[6-9]|2[0-9]|3[01])\./.test(addr)) return true; // private B
  if (/^169\.254\./.test(addr)) return true; // link-local incl. AWS/GCP metadata
  if (/^100\.(?:6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\./.test(addr)) return true; // CGNAT
  if (/^0\./.test(addr)) return true; // "this network"
  if (/^(?:22[4-9]|23[0-9])\./.test(addr)) return true; // multicast
  if (/^(?:24[0-9]|25[0-5])\./.test(addr)) return true; // reserved / broadcast
  // IPv6
  const lower = addr.toLowerCase();
  if (lower === "::1") return true; // loopback
  if (lower === "::") return true; // unspecified
  if (/^fe[89ab][0-9a-f]:/.test(lower)) return true; // link-local fe80::/10
  if (/^f[cd][0-9a-f]{2}:/.test(lower)) return true; // unique-local fc00::/7
  if (/^ff[0-9a-f]{2}:/.test(lower)) return true; // multicast ff00::/8
  // IPv4-mapped IPv6 (::ffff:a.b.c.d) — re-apply v4 checks
  const mapped = lower.match(/^::ffff:([0-9a-f.:]+)$/);
  if (mapped?.[1]) return isPrivateIp(mapped[1]);
  return false;
}

interface ResolvedHost {
  ok: true;
  address: string;
}
interface ResolutionRefused {
  ok: false;
  reason: string;
}

async function resolveHost(hostname: string): Promise<ResolvedHost | ResolutionRefused> {
  if (!hostname) return { ok: false, reason: "Missing hostname" };
  // Strip brackets for IPv6 literals before dns.lookup.
  const host = hostname.replace(/^\[(.+)\]$/, "$1");
  // Literal IPs bypass DNS — guard them directly.
  if (/^[0-9.]+$/.test(host) || /^[0-9a-f:.]+$/i.test(host)) {
    if (isPrivateIp(host)) {
      return { ok: false, reason: `Refused: ${host} is in a private/reserved range` };
    }
  }
  try {
    const { address } = await lookup(host, { verbatim: true });
    if (isPrivateIp(address)) {
      return { ok: false, reason: `Refused: ${host} resolved to private/reserved ${address}` };
    }
    return { ok: true, address };
  } catch (err) {
    return {
      ok: false,
      reason: `DNS lookup failed for ${host}: ${err instanceof Error ? err.message : "unknown"}`,
    };
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extractMeta(html: string): { title?: string; description?: string } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch?.[1] ? stripHtml(titleMatch[1]).slice(0, 200) : undefined;
  const descMatch =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i) ??
    html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
  const description = descMatch?.[1] ? stripHtml(descMatch[1]).slice(0, 400) : undefined;
  return { title, description };
}

async function readWithCap(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return await res.text();
  const decoder = new TextDecoder();
  let received = 0;
  let out = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    received += value.byteLength;
    out += decoder.decode(value, { stream: true });
    if (received >= MAX_BYTES) {
      try {
        await reader.cancel();
      } catch {
        /* ignore */
      }
      break;
    }
  }
  out += decoder.decode();
  return out;
}

export async function scanUrl(rawUrl: string): Promise<ScannedSeed> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { seed: rawUrl, rawUrl, error: "Invalid URL" };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { seed: rawUrl, rawUrl, error: "Only http(s) URLs are supported" };
  }

  // SSRF guard — resolve the host and refuse private / loopback / link-local
  // / CGNAT / reserved ranges. Runs BEFORE the fetch so we never touch
  // internal infra.
  const resolved = await resolveHost(url.hostname);
  if (!resolved.ok) {
    return { seed: rawUrl, rawUrl, error: resolved.reason };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      // Manual redirect — refuses 3xx outright so a public host cannot redirect
      // us to a private one between resolveHost and the response landing.
      redirect: "manual",
      signal: controller.signal,
      headers: {
        accept: "text/html,application/xhtml+xml",
        "accept-language": "en-US,en;q=0.9",
        "user-agent": USER_AGENT,
      },
    });
  } catch (err) {
    clearTimeout(timeoutId);
    return {
      seed: rawUrl,
      rawUrl,
      error: err instanceof Error ? `Fetch failed: ${err.message}` : "Fetch failed",
    };
  }
  clearTimeout(timeoutId);

  if (res.status >= 300 && res.status < 400) {
    return {
      seed: rawUrl,
      rawUrl,
      error: `Refused: ${url.host} responded with redirect (${res.status}); only direct responses are followed`,
    };
  }

  if (!res.ok) {
    return { seed: rawUrl, rawUrl, error: `HTTP ${res.status} from ${url.host}` };
  }
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType && !contentType.includes("html")) {
    return {
      seed: rawUrl,
      rawUrl,
      error: `Skipped: content-type "${contentType}" is not HTML`,
    };
  }

  let html = "";
  try {
    html = await readWithCap(res);
  } catch (err) {
    return {
      seed: rawUrl,
      rawUrl,
      error: err instanceof Error ? `Read failed: ${err.message}` : "Read failed",
    };
  }
  if (!html) {
    return { seed: rawUrl, rawUrl, error: "Empty response body" };
  }

  const { title, description } = extractMeta(html);
  const bodyText = stripHtml(html).slice(0, MAX_TEXT_CHARS);

  const scan: ScanResult = {
    url: url.toString(),
    host: url.host.replace(/^www\./, ""),
    title,
    description,
    bodyText,
  };

  const seedParts: string[] = [`The user pasted a website URL: ${scan.url} (${scan.host}).`];
  if (title) seedParts.push(`Title: ${title}`);
  if (description) seedParts.push(`Meta description: ${description}`);
  if (bodyText) seedParts.push(`Page text (first ${bodyText.length} chars):\n${bodyText}`);
  seedParts.push(
    "Treat the above as the product context and generate ICP archetypes for whoever this company sells to (or would sell to).",
  );

  return {
    seed: seedParts.join("\n\n"),
    rawUrl,
    scan,
  };
}
