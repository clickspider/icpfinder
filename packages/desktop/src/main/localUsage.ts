// SPDX-License-Identifier: MIT
//
// How much of a plan window IcpFinder used. Claude Code reports a window's %
// for the whole account. We split it: IcpFinder's own runs (recorded exactly)
// against everything else Claude Code ran on this Mac (its local session
// logs). Both sides use the same weights, so the split is fair. It is an
// estimate: use on claude.ai or other devices is not in the local logs.

import { createReadStream } from "node:fs";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";

/** Relative plan weight of one run, by model and token type (list-price ratios). */
export const weightOf = (
  model: string,
  u: { input: number; output: number; cacheRead: number; cacheWrite: number }
): number => {
  const m = model.toLowerCase();
  const factor = m.includes("haiku") ? 0.33 : m.includes("sonnet") ? 1 : 5;
  return (u.input + u.cacheWrite * 1.25 + u.output * 5 + u.cacheRead * 0.1) * factor;
};

interface FileCache {
  size: number;
  /** hour (ISO, to the hour) → weight */
  hours: Record<string, number>;
}

let cacheFile = "";
let cache: Record<string, FileCache> = {};
let loaded = false;

export const initLocalUsage = (file: string): void => {
  cacheFile = file;
};

const hourOf = (iso: string) => `${iso.slice(0, 13)}:00`;

const listJsonl = async (dir: string, since: number, out: string[]): Promise<void> => {
  let entries: import("node:fs").Dirent[];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) await listJsonl(p, since, out);
    else if (e.name.endsWith(".jsonl")) {
      const s = await stat(p).catch(() => null);
      if (s && s.mtimeMs >= since) out.push(p);
    }
  }
};

/** Read only the new bytes of each log since the last scan. */
const scan = async (since: number): Promise<void> => {
  if (!loaded) {
    loaded = true;
    cache = JSON.parse(await readFile(cacheFile, "utf8").catch(() => "{}")) as Record<
      string,
      FileCache
    >;
  }
  const files: string[] = [];
  await listJsonl(join(homedir(), ".claude", "projects"), since, files);
  for (const f of files) {
    const s = await stat(f).catch(() => null);
    if (!s) continue;
    const c = cache[f] ?? { size: 0, hours: {} };
    if (s.size < c.size) {
      c.size = 0;
      c.hours = {};
    }
    if (s.size === c.size) continue;
    const rl = createInterface({ input: createReadStream(f, { start: c.size }) });
    for await (const line of rl) {
      if (!line.includes('"usage"') || !line.includes('"assistant"')) continue;
      try {
        const d = JSON.parse(line) as {
          type?: string;
          timestamp?: string;
          message?: {
            model?: string;
            usage?: {
              input_tokens?: number;
              output_tokens?: number;
              cache_read_input_tokens?: number;
              cache_creation_input_tokens?: number;
            };
          };
        };
        const m = d.message;
        if (d.type !== "assistant" || !m?.usage || !d.timestamp || m.model === "<synthetic>")
          continue;
        const w = weightOf(m.model ?? "", {
          input: m.usage.input_tokens ?? 0,
          output: m.usage.output_tokens ?? 0,
          cacheRead: m.usage.cache_read_input_tokens ?? 0,
          cacheWrite: m.usage.cache_creation_input_tokens ?? 0,
        });
        const h = hourOf(d.timestamp);
        c.hours[h] = (c.hours[h] ?? 0) + w;
      } catch {
        // a half-written last line; read again next time
      }
    }
    c.size = s.size;
    cache[f] = c;
  }
  // Forget hours older than 8 days.
  const cut = hourOf(new Date(Date.now() - 8 * 86_400_000).toISOString());
  for (const c of Object.values(cache))
    for (const h of Object.keys(c.hours)) if (h < cut) delete c.hours[h];
  await writeFile(cacheFile, JSON.stringify(cache)).catch(() => {});
};

/** Weight of everything Claude Code ran on this Mac from `since` until now. */
export const localWeight = async (since: Date): Promise<number> => {
  await scan(since.getTime() - 3_600_000);
  const from = hourOf(since.toISOString());
  let sum = 0;
  for (const c of Object.values(cache))
    for (const [h, w] of Object.entries(c.hours)) if (h >= from) sum += w;
  return sum;
};
