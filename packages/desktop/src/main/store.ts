// SPDX-License-Identifier: MIT
//
// Local store: one JSON file in the app's data folder. Writes go to a temp
// file first, then rename, so a crash never leaves a half-written file.
// ponytail: one file for all workspaces; split per workspace if it grows past a few MB.

import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { isProvider } from "../shared/provider-models";
import type { State, Workspace } from "../shared/types";

export const emptyState = (): State => ({
  workspaces: [],
  activeId: null,
  settings: {
    provider: "claude",
    hunterKey: "",
    windowDays: 120,
    dropTime: "06:00",
    askBeforeEmail: true,
    model: "sonnet",
    sources: {
      hn: true,
      reddit: false,
      x: false,
      linkedin: false,
      fallback: true,
      browser: "yours",
    },
  },
  contacts: [],
});

/** Old saves used CLI aliases; the app now names the exact model and version. */
const migrate = (s: State["settings"]): State["settings"] => ({
  ...s,
  provider: isProvider(s.provider) ? s.provider : "claude",
  sources: { ...emptyState().settings.sources, ...s.sources },
  model: s.model,
});

export const loadState = (file: string): State => {
  try {
    const raw = JSON.parse(readFileSync(file, "utf8")) as Partial<State>;
    const base = emptyState();
    return {
      workspaces: Array.isArray(raw.workspaces) ? raw.workspaces : [],
      activeId: typeof raw.activeId === "string" ? raw.activeId : null,
      settings: migrate({ ...base.settings, ...(raw.settings ?? {}) }),
      contacts: Array.isArray(raw.contacts) ? raw.contacts : [],
      network: raw.network ?? {},
      companyFacts: raw.companyFacts ?? {},
      usage: Array.isArray(raw.usage) ? raw.usage : [],
      usageRecent: Array.isArray(raw.usageRecent) ? raw.usageRecent : [],
    };
  } catch {
    return emptyState();
  }
};

export const saveState = (file: string, state: State): void => {
  mkdirSync(dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, JSON.stringify(state, null, 2), { mode: 0o600 });
  renameSync(tmp, file);
};

export const activeWorkspace = (state: State): Workspace | undefined =>
  state.workspaces.find((w) => w.id === state.activeId);

/** Apply a change to the active workspace; returns the same state object. */
export const updateActive = (state: State, fn: (w: Workspace) => void): State => {
  const ws = activeWorkspace(state);
  if (!ws) throw new Error("No active workspace");
  fn(ws);
  return state;
};
