// SPDX-License-Identifier: MIT
//
// Records every AI call IcpFinder makes, labelled with the product and task.
// Kept as daily rows (day × product × task × provider × model), 90 days.

import { AsyncLocalStorage } from "node:async_hooks";
import type { CliUsage } from "@icpfinder/providers";
import { add, emptyTotals, type Provider, type UsageRow } from "../shared/usage";
import { weightOf } from "./localUsage";

/** The task the current async work belongs to, e.g. "Hunting". */
export const taskLabel = new AsyncLocalStorage<string>();
export const withTask = <T>(label: string, fn: () => Promise<T>): Promise<T> =>
  taskLabel.run(label, fn);

let sink: (rows: UsageRow[]) => void = () => {};
let rows: UsageRow[] = [];
let wsOf: () => string | undefined = () => undefined;
/** Each run's time and plan weight, last 8 days, for the plan-window split. */
let recent: Array<{ at: number; w: number }> = [];
let saveRecent: (r: Array<{ at: number; w: number }>) => void = () => {};

export const initUsage = (
  start: UsageRow[],
  save: (rows: UsageRow[]) => void,
  currentWs: () => string | undefined,
  startRecent: Array<{ at: number; w: number }> = [],
  onRecent: (r: Array<{ at: number; w: number }>) => void = () => {}
): void => {
  rows = start;
  sink = save;
  wsOf = currentWs;
  recent = startRecent;
  saveRecent = onRecent;
};

/** IcpFinder's plan weight since a time. */
export const appWeight = (since: Date): number =>
  recent.filter((r) => r.at >= since.getTime()).reduce((n, r) => n + r.w, 0);

export const recordUsage = (provider: Provider, u: CliUsage): void => {
  const day = new Date().toISOString().slice(0, 10);
  const ws = wsOf() ?? "app";
  const task = taskLabel.getStore() ?? "Other";
  const model = u.model || "unknown";
  const hit = rows.find(
    (r) =>
      r.day === day &&
      r.ws === ws &&
      r.task === task &&
      r.provider === provider &&
      r.model === model
  );
  const delta = { calls: 1, ...u };
  if (hit) Object.assign(hit, add(hit, delta));
  else rows.push({ day, ws, task, provider, model, ...add(emptyTotals(), delta) });
  if (provider === "claude") recent.push({ at: Date.now(), w: weightOf(model, u) });
  recent = recent.filter((r) => r.at >= Date.now() - 8 * 86_400_000);
  saveRecent(recent);
  const cut = new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10);
  rows = rows.filter((r) => r.day >= cut);
  sink(rows);
};
