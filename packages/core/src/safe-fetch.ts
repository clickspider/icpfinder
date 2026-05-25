// SPDX-License-Identifier: MIT
//
// safe-fetch — SSRF-hardened wrapper around globalThis.fetch.
//
// When the user pastes a URL ("research this competitor") we MUST NOT
// blindly fetch it from server context. A malicious URL targeting
// 169.254.169.254 (cloud metadata), 127.0.0.1, 10.0.0.0/8, or a
// redirector pointing at the same can exfiltrate IAM credentials or
// pivot into internal services.
//
// Hard rules enforced here:
//   - https only (no http, file, gopher, ftp)
//   - hostname must resolve to a public unicast IPv4/IPv6 address
//   - max 3 redirects, each re-validated against the same rules
//   - response size capped (default 2 MB)
//   - request timeout (default 5 s)
//   - content-type must be allow-listed (default text/html, text/plain,
//     application/json, application/xml, text/xml)
//   - no credentials, no cookies sent

import { promises as dns } from "node:dns";
import { isIP } from "node:net";

export class SafeFetchError extends Error {
  override name = "SafeFetchError";
  constructor(
    message: string,
    readonly code:
      | "INVALID_URL"
      | "BAD_SCHEME"
      | "BLOCKED_HOST"
      | "DNS_FAILURE"
      | "TOO_MANY_REDIRECTS"
      | "RESPONSE_TOO_LARGE"
      | "BAD_CONTENT_TYPE"
      | "TIMEOUT"
      | "FETCH_FAILED"
  ) {
    super(message);
  }
}

export interface SafeFetchOptions {
  /** Max redirects to follow. Default 3. */
  maxRedirects?: number;
  /** Max response body size in bytes. Default 2_000_000. */
  maxBytes?: number;
  /** Per-request timeout in ms (applies per hop). Default 5_000. */
  timeoutMs?: number;
  /** Allow-listed Content-Type prefixes. */
  allowedContentTypes?: string[];
  /** Override fetch (testing). */
  fetchImpl?: typeof fetch;
  /** Override DNS resolver (testing). Receives hostname, returns IPs. */
  resolveHost?: (hostname: string) => Promise<string[]>;
}

export interface SafeFetchResult {
  finalUrl: string;
  status: number;
  contentType: string;
  body: string;
}

const DEFAULT_MAX_REDIRECTS = 3;
const DEFAULT_MAX_BYTES = 2_000_000;
const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_CONTENT_TYPES = [
  "text/html",
  "text/plain",
  "application/json",
  "application/xml",
  "text/xml",
];

const defaultResolveHost = async (hostname: string): Promise<string[]> => {
  const records = await dns.lookup(hostname, { all: true });
  return records.map((r) => r.address);
};

/**
 * Determine if an IPv4 string is in a non-public range (RFC 1918,
 * loopback, link-local, multicast, broadcast, AWS/GCP metadata, etc.).
 */
const isBlockedIPv4 = (ip: string): boolean => {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
    return true;
  }
  const [a, b] = parts as [number, number, number, number];
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // RFC1918
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local + metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // RFC1918
  if (a === 192 && b === 168) return true; // RFC1918
  if (a === 192 && b === 0) return true; // 192.0.0.0/24 (incl 192.0.2.0/24)
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a >= 224) return true; // multicast + reserved + broadcast
  return false;
};

/**
 * IPv6: block loopback (::1), link-local (fe80::/10), unique-local
 * (fc00::/7), and IPv4-mapped (::ffff:0:0/96 — defer to v4 check).
 */
const isBlockedIPv6 = (ip: string): boolean => {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true;
  if (
    lower.startsWith("fe8") ||
    lower.startsWith("fe9") ||
    lower.startsWith("fea") ||
    lower.startsWith("feb")
  ) {
    return true; // fe80::/10
  }
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // fc00::/7
  if (lower.startsWith("::ffff:")) {
    const v4 = lower.slice(7);
    return isBlockedIPv4(v4);
  }
  return false;
};

const isBlockedIP = (ip: string): boolean => {
  const version = isIP(ip);
  if (version === 4) return isBlockedIPv4(ip);
  if (version === 6) return isBlockedIPv6(ip);
  return true;
};

const validateUrl = async (
  raw: string,
  resolveHost: (hostname: string) => Promise<string[]>
): Promise<URL> => {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new SafeFetchError(`Invalid URL: ${raw}`, "INVALID_URL");
  }
  if (parsed.protocol !== "https:") {
    throw new SafeFetchError(`Only https URLs allowed (got ${parsed.protocol})`, "BAD_SCHEME");
  }
  if (parsed.username || parsed.password) {
    throw new SafeFetchError("URLs with credentials not allowed", "BAD_SCHEME");
  }
  const hostname = parsed.hostname;
  // WHATWG URL preserves brackets around IPv6 hostnames; strip them
  // before passing to net.isIP.
  const bareHost =
    hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1) : hostname;
  const ipVersion = isIP(bareHost);
  if (ipVersion !== 0) {
    if (isBlockedIP(bareHost)) {
      throw new SafeFetchError(`Blocked host: ${bareHost}`, "BLOCKED_HOST");
    }
    return parsed;
  }
  let addresses: string[];
  try {
    addresses = await resolveHost(hostname);
  } catch {
    throw new SafeFetchError(`DNS lookup failed for ${hostname}`, "DNS_FAILURE");
  }
  if (addresses.length === 0) {
    throw new SafeFetchError(`No DNS records for ${hostname}`, "DNS_FAILURE");
  }
  for (const addr of addresses) {
    if (isBlockedIP(addr)) {
      throw new SafeFetchError(
        `Hostname ${hostname} resolves to blocked IP ${addr}`,
        "BLOCKED_HOST"
      );
    }
  }
  return parsed;
};

export const safeFetch = async (
  url: string,
  opts: SafeFetchOptions = {}
): Promise<SafeFetchResult> => {
  const maxRedirects = opts.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const allowedContentTypes = opts.allowedContentTypes ?? DEFAULT_CONTENT_TYPES;
  const fetchImpl = opts.fetchImpl ?? globalThis.fetch;
  const resolveHost = opts.resolveHost ?? defaultResolveHost;

  let current = url;
  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    const validated = await validateUrl(current, resolveHost);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await fetchImpl(validated.toString(), {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: { accept: allowedContentTypes.join(", ") },
        credentials: "omit",
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new SafeFetchError(`Request timed out after ${timeoutMs}ms`, "TIMEOUT");
      }
      throw new SafeFetchError(
        `Fetch failed: ${err instanceof Error ? err.message : String(err)}`,
        "FETCH_FAILED"
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        throw new SafeFetchError(
          `Redirect response ${response.status} missing Location header`,
          "FETCH_FAILED"
        );
      }
      if (hop === maxRedirects) {
        throw new SafeFetchError(`Exceeded ${maxRedirects} redirects`, "TOO_MANY_REDIRECTS");
      }
      current = new URL(location, validated).toString();
      continue;
    }

    const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
    const baseType = contentType.split(";")[0]?.trim() ?? "";
    if (!allowedContentTypes.some((allowed) => baseType === allowed.toLowerCase())) {
      throw new SafeFetchError(
        `Disallowed content-type: ${baseType || "<missing>"}`,
        "BAD_CONTENT_TYPE"
      );
    }

    const body = await readBounded(response, maxBytes);
    return {
      finalUrl: validated.toString(),
      status: response.status,
      contentType: baseType,
      body,
    };
  }
  throw new SafeFetchError(`Exceeded ${maxRedirects} redirects`, "TOO_MANY_REDIRECTS");
};

const readBounded = async (response: Response, maxBytes: number): Promise<string> => {
  const reader = response.body?.getReader();
  if (!reader) {
    const text = await response.text();
    if (text.length > maxBytes) {
      throw new SafeFetchError(`Response body exceeded ${maxBytes} bytes`, "RESPONSE_TOO_LARGE");
    }
    return text;
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new SafeFetchError(`Response body exceeded ${maxBytes} bytes`, "RESPONSE_TOO_LARGE");
      }
      chunks.push(value);
    }
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8").decode(merged);
};
