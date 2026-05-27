// SPDX-License-Identifier: MIT
//
// Server-only website scanner. Fetches a URL, extracts the title, meta
// description, and first ~4 KB of visible text, returns a compact summary
// suitable for prepending to the seed before handing to the LLM. Never throws —
// caller falls back to the raw seed on failure.

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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      redirect: "follow",
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
