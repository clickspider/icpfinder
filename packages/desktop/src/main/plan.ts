// SPDX-License-Identifier: MIT
//
// The founder's plan limits, the way Claude Code shows them (`/usage`):
// session and weekly windows, % used and when each resets. Asking costs no
// tokens. Generic shape so Codex can report the same way later.

import { execFile } from "node:child_process";
import type { PlanUsage } from "../shared/usage";

const LABEL: Array<[RegExp, string]> = [
  [/^current session$/i, "Session"],
  [/^current week \(all models\)$/i, "Week · all models"],
  [/^current week \((.+)\)$/i, "Week · $1"],
];

/** Parse the text of Claude Code's `/usage`. */
export const parseClaudeUsage = (text: string): PlanUsage => {
  const windows: PlanUsage["windows"] = [];
  for (const m of text.matchAll(/^(Current [^:]+):\s*(\d+)% used(?:\s*·\s*resets ([^\n]+))?$/gim)) {
    const raw = (m[1] ?? "").trim();
    const hit = LABEL.find(([re]) => re.test(raw));
    windows.push({
      label: hit ? raw.replace(hit[0], hit[1]) : raw,
      pct: Number(m[2] ?? 0),
      resets: (m[3] ?? "").replace(/\s*\([^)]*\)\s*$/, "").trim(),
    });
  }
  return {
    provider: "claude",
    plan: /subscription/i.test(text) ? "Subscription" : "API key",
    windows,
    at: new Date().toISOString(),
  };
};

let cache: PlanUsage | null = null;

/** Run `/usage` headless (no tokens used). Cached for a minute. */
export const readClaudePlan = (bin: string): Promise<PlanUsage | null> => {
  if (cache && Date.now() - Date.parse(cache.at) < 60_000) return Promise.resolve(cache);
  const { ANTHROPIC_API_KEY: _a, ANTHROPIC_AUTH_TOKEN: _b, ...env } = process.env;
  return new Promise((resolve) => {
    const child = execFile(
      bin,
      ["-p", "--output-format", "json", "--setting-sources", "", "--no-session-persistence"],
      { env, timeout: 60_000 },
      (err, stdout) => {
        if (err) return resolve(cache);
        try {
          const text = (JSON.parse(stdout) as { result?: string }).result ?? "";
          cache = parseClaudeUsage(text);
          resolve(cache);
        } catch {
          resolve(cache);
        }
      }
    );
    child.stdin?.end("/usage");
  });
};

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** When a window started: its reset time minus its length (5 hours, or 7 days for a week). */
export const windowStart = (label: string, resets: string, now = new Date()): Date | null => {
  const m = resets.match(
    /([A-Za-z]{3})\w*\s+(\d{1,2})(?:\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm))?/i
  );
  if (!m) return null;
  const month = MONTHS.indexOf((m[1] ?? "").toLowerCase());
  if (month < 0) return null;
  let hour = Number(m[3] ?? 0) % 12;
  if ((m[5] ?? "").toLowerCase() === "pm") hour += 12;
  const reset = new Date(now.getFullYear(), month, Number(m[2]), hour, Number(m[4] ?? 0));
  if (reset.getTime() < now.getTime() - 86_400_000) reset.setFullYear(reset.getFullYear() + 1);
  const length = /^session/i.test(label) ? 5 * 3_600_000 : 7 * 86_400_000;
  return new Date(reset.getTime() - length);
};
