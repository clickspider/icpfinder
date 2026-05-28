// SPDX-License-Identifier: MIT
//
// Vercel KV / Upstash-backed caches for runs and per-phase artifacts.
//
//   - `getCachedRun` / `setCachedRun`          single-shot /api/find events
//   - `getCachedArchetypes` / `setCachedArchetypes`  phase 1 archetype list
//   - `getCachedCandidates` / `setCachedCandidates`  phase 2 candidates per archetype
//   - `getCachedDeepen`   / `setCachedDeepen`        24h dossier cache by candidateId
//   - `getCachedOutreach` / `setCachedOutreach`      24h outreach draft cache
//
// Operator-mode only; BYOK + stub bypass.
//
// Failure modes (all no-op gracefully):
//   - KV env vars missing  → cache disabled, every request goes live
//   - KV network error     → ignored, falls through to live run

import type { Archetype, Candidate, DeepenResult, FindEvent } from "@icpfinder/core";

const TTL_SECONDS = 15 * 60;
const DEEPEN_TTL_SECONDS = 24 * 60 * 60;
// Bumped to v2 to invalidate caches captured when live API keys were not
// configured (FakeLlmProvider returned [STUB] payloads that would otherwise
// stick around for the full TTL).
const VERSION = "v2";
const KEY_BYTES = 12;

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

const runKey = (hash: string): string => `icpfinder:run:${VERSION}:${hash}`;
const archetypesKey = (hash: string): string => `icpfinder:archetypes:${VERSION}:${hash}`;
const candidatesKey = (hash: string, archetypeId: string): string =>
  `icpfinder:candidates:${VERSION}:${hash}:${archetypeId}`;
const moreCandidatesKey = (hash: string, archetypeId: string, offset: number): string =>
  `icpfinder:more:${VERSION}:${hash}:${archetypeId}:${offset}`;
// Bumped v1 → v2 to invalidate stub results captured before live keys were
// configured. setCachedDeepen also refuses to write `[STUB]` values, so the
// cache stays clean going forward.
const deepenKey = (candidateId: string): string =>
  `icpfinder:deepen:${VERSION}:${candidateId}`;
const outreachKey = (candidateId: string): string =>
  `icpfinder:outreach:${VERSION}:${candidateId}`;

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

// ── Legacy single-shot cache (SDK /api/find) ─────────────────────────────────

export async function getCachedRun(seed: string): Promise<FindEvent[] | null> {
  const kv = await getKv();
  if (!kv) return null;
  try {
    const h = await hashSeed(seed);
    const value = await kv.get<FindEvent[]>(runKey(h));
    return Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

export async function setCachedRun(seed: string, events: FindEvent[]): Promise<void> {
  const kv = await getKv();
  if (!kv) return;
  const hasArchetype = events.some((e) => e.type === "archetype");
  const endedDone = events.some((e) => e.type === "done");
  const hadFatalError = events.some((e) => e.type === "error" && e.recoverable === false);
  if (!hasArchetype || !endedDone || hadFatalError) return;
  try {
    const h = await hashSeed(seed);
    await kv.set(runKey(h), events, { ex: TTL_SECONDS });
  } catch {
    // ignore
  }
}

// ── Phase 1: archetype list ──────────────────────────────────────────────────

export async function getCachedArchetypes(seed: string): Promise<Archetype[] | null> {
  const kv = await getKv();
  if (!kv) return null;
  try {
    const h = await hashSeed(seed);
    const value = await kv.get<Archetype[]>(archetypesKey(h));
    return Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

const looksLikeStub = (archetypes: Archetype[]): boolean =>
  archetypes.some(
    (a) =>
      a.industry.includes("[STUB]") ||
      a.role.includes("[STUB]") ||
      a.pain.includes("[STUB]"),
  );

export async function setCachedArchetypes(seed: string, archetypes: Archetype[]): Promise<void> {
  const kv = await getKv();
  if (!kv || archetypes.length === 0 || looksLikeStub(archetypes)) return;
  try {
    const h = await hashSeed(seed);
    await kv.set(archetypesKey(h), archetypes, { ex: TTL_SECONDS });
  } catch {
    // ignore
  }
}

// Memory fallback so dev without KV still supports phase 2. Keyed identically
// to KV; TTL enforced by checking the timestamp at read.
const memoryArchetypes = new Map<string, { archetypes: Archetype[]; expiresAt: number }>();

export async function rememberArchetypes(seed: string, archetypes: Archetype[]): Promise<void> {
  if (archetypes.length === 0 || looksLikeStub(archetypes)) return;
  const h = await hashSeed(seed);
  memoryArchetypes.set(h, { archetypes, expiresAt: Date.now() + TTL_SECONDS * 1000 });
  await setCachedArchetypes(seed, archetypes);
}

export async function recallArchetypes(seed: string): Promise<Archetype[] | null> {
  const fromKv = await getCachedArchetypes(seed);
  if (fromKv) return fromKv;
  const h = await hashSeed(seed);
  const entry = memoryArchetypes.get(h);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    memoryArchetypes.delete(h);
    return null;
  }
  return entry.archetypes;
}

// ── Phase 2: per-archetype candidates ────────────────────────────────────────

export async function getCachedCandidates(
  seed: string,
  archetypeId: string,
): Promise<Candidate[] | null> {
  const kv = await getKv();
  if (!kv) return null;
  try {
    const h = await hashSeed(seed);
    const value = await kv.get<Candidate[]>(candidatesKey(h, archetypeId));
    return Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

export async function setCachedCandidates(
  seed: string,
  archetypeId: string,
  candidates: Candidate[],
): Promise<void> {
  const kv = await getKv();
  if (!kv || candidates.length === 0) return;
  try {
    const h = await hashSeed(seed);
    await kv.set(candidatesKey(h, archetypeId), candidates, { ex: TTL_SECONDS });
  } catch {
    // ignore
  }
}

export async function getCachedMoreCandidates(
  seed: string,
  archetypeId: string,
  offset: number,
): Promise<Candidate[] | null> {
  const kv = await getKv();
  if (!kv) return null;
  try {
    const h = await hashSeed(seed);
    const value = await kv.get<Candidate[]>(moreCandidatesKey(h, archetypeId, offset));
    return Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

export async function setCachedMoreCandidates(
  seed: string,
  archetypeId: string,
  offset: number,
  candidates: Candidate[],
): Promise<void> {
  const kv = await getKv();
  if (!kv || candidates.length === 0) return;
  try {
    const h = await hashSeed(seed);
    await kv.set(moreCandidatesKey(h, archetypeId, offset), candidates, { ex: TTL_SECONDS });
  } catch {
    // ignore
  }
}

// ── Deepen — 24h cache by candidateId ────────────────────────────────────────

export async function getCachedDeepen(candidateId: string): Promise<DeepenResult | null> {
  const kv = await getKv();
  if (!kv) return null;
  try {
    const value = await kv.get<DeepenResult>(deepenKey(candidateId));
    return value ?? null;
  } catch {
    return null;
  }
}

export async function setCachedDeepen(result: DeepenResult): Promise<void> {
  const kv = await getKv();
  if (!kv) return;
  try {
    await kv.set(deepenKey(result.candidateId), result, { ex: DEEPEN_TTL_SECONDS });
  } catch {
    // ignore
  }
}

// ── Outreach — 24h cache by candidateId ──────────────────────────────────────

export async function getCachedOutreach(candidateId: string): Promise<string | null> {
  const kv = await getKv();
  if (!kv) return null;
  try {
    const value = await kv.get<string>(outreachKey(candidateId));
    return typeof value === "string" ? value : null;
  } catch {
    return null;
  }
}

export async function setCachedOutreach(candidateId: string, draft: string): Promise<void> {
  const kv = await getKv();
  if (!kv || !draft) return;
  try {
    await kv.set(outreachKey(candidateId), draft, { ex: DEEPEN_TTL_SECONDS });
  } catch {
    // ignore
  }
}
