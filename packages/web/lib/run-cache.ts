// SPDX-License-Identifier: MIT
//
// Vercel KV-backed run cache. Operator-mode runs only — BYOK runs pay their
// own way and never touch this cache.
//
// Strategy:
//   - Key = `icpfinder:run:${VERSION}:${sha256(seed)}`
//   - Value = complete array of FindEvents from a successful run
//   - TTL = 15 minutes (long enough to dedupe twin submissions, short enough
//     that fresh data flows for new visitors)
//   - Replays are streamed identically to a live run — same SSE shape, same
//     event order, same cost numbers (the user sees exactly what they would
//     have seen live, just faster).
//
// Failure modes (all no-op gracefully):
//   - KV env vars missing  → cache disabled, every request goes live
//   - KV network error     → ignored, falls through to live run
//   - Cache hit on a `error`/empty run is impossible (we only cache on
//     `done` events with at least one archetype — see setCachedRun)

import type { FindEvent } from "@icpfinder/core";

const TTL_SECONDS = 15 * 60;
const VERSION = "v1";
const KEY_BYTES = 12; // 24 hex chars; collision-unworthy at this volume

const kvEnabled = (): boolean =>
  Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

const hashSeed = async (seed: string): Promise<string> => {
  const data = new TextEncoder().encode(seed.trim().toLowerCase());
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .slice(0, KEY_BYTES)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

const cacheKey = (hash: string): string => `icpfinder:run:${VERSION}:${hash}`;

interface KvClient {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, opts: { ex: number }): Promise<unknown>;
}

let cachedClient: KvClient | null | undefined;

async function getKv(): Promise<KvClient | null> {
  if (cachedClient !== undefined) return cachedClient;
  if (!kvEnabled()) {
    cachedClient = null;
    return null;
  }
  try {
    const mod = (await import("@vercel/kv")) as { kv: KvClient };
    cachedClient = mod.kv;
    return cachedClient;
  } catch {
    cachedClient = null;
    return null;
  }
}

export async function getCachedRun(seed: string): Promise<FindEvent[] | null> {
  const kv = await getKv();
  if (!kv) return null;
  try {
    const h = await hashSeed(seed);
    const value = await kv.get<FindEvent[]>(cacheKey(h));
    return Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

export async function setCachedRun(seed: string, events: FindEvent[]): Promise<void> {
  const kv = await getKv();
  if (!kv) return;
  // Only cache successful runs with real content.
  const hasArchetype = events.some((e) => e.type === "archetype");
  const endedDone = events.some((e) => e.type === "done");
  const hadFatalError = events.some((e) => e.type === "error" && e.recoverable === false);
  if (!hasArchetype || !endedDone || hadFatalError) return;
  try {
    const h = await hashSeed(seed);
    await kv.set(cacheKey(h), events, { ex: TTL_SECONDS });
  } catch {
    // ignore
  }
}
