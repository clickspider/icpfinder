// SPDX-License-Identifier: MIT
//
// IcpFinder main process: window, IPC, and a one-at-a-time research queue.

import { mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  ipcMain,
  safeStorage,
  session,
  shell,
} from "electron";
import { type Listen, listenDue, MAX_NOTICES_A_DAY, type Notice } from "../shared/listen";
import {
  type CompanyFacts,
  companiesForLinkedIn,
  companiesToCheck,
  companiesToSearch,
  LINKEDIN,
  normCompany,
} from "../shared/people";
import { defaultModel, isProvider, PROVIDER_MODELS } from "../shared/provider-models";
import { type Scoring, score, scoringOf } from "../shared/scoring";
import type {
  ActionId,
  Company,
  HuntStepKind,
  IcpCard,
  IcpCriteria,
  Product,
  Settings,
  State,
  Workspace,
} from "../shared/types";
import { BrowserAgent } from "./agent";
import { openLogin } from "./browse";
import { resolveCli } from "./cli";
import { customIcp } from "./custom-icp";
import {
  classifyCompanies,
  companyLogo,
  configureSubscriptions,
  createLlm,
  detectAi,
  findIcps,
  findReach,
  huntSteps,
  isPaused,
  jobKeys,
  jobs,
  linkedinFacts,
  parseConnections,
  pauseWorkspace,
  profileForIcp,
  readIdea,
  readProduct,
  refineCriteria,
  regateIcp,
  researchCompany,
  resumeWorkspace,
  runCompanyAction,
  setModel,
  setProvider,
  setSources,
  sourceCompanies,
  verifyHunter,
  warmFor,
  watchCompany,
  which,
} from "./engine";
import { listenFor, suggestListen } from "./listen";
import { initLocalUsage, localWeight } from "./localUsage";
import { dockProgress, initNotify, notify } from "./notify";
import { readClaudePlan, windowStart } from "./plan";
import { activeWorkspace, loadState, saveState, updateActive } from "./store";
import { SubscriptionAuth } from "./subscription-auth";
import { appWeight, initUsage, withTask } from "./usage";

let accounts: SubscriptionAuth;

const file = (): string => join(app.getPath("userData"), "icpfinder.json");
let state: State;
let win: BrowserWindow | null = null;
let agent: BrowserAgent | null = null;

const commit = (): State => {
  saveState(file(), state);
  win?.webContents.send("state", state);
  return state;
};

// ponytail: 2 researches at a time (each is several web-grounded Claude runs); raise WORKERS if the plan allows.
const WORKERS = 2;
const queue: Array<{ wsId: string; icpId: string; domain: string }> = [];
let active = 0;

const locate = (job: { wsId: string; icpId: string; domain: string }) => {
  const ws = state.workspaces.find((w) => w.id === job.wsId);
  const icp = ws?.icps.find((i) => i.id === job.icpId);
  const idx = icp?.companies.findIndex((c) => c.domain === job.domain) ?? -1;
  return { ws, icp, idx };
};

const work = async (job: { wsId: string; icpId: string; domain: string }): Promise<void> => {
  const { ws, icp, idx } = locate(job);
  const company = icp?.companies[idx];
  if (!ws || !icp || !company) return;
  icp.companies[idx] = { ...company, status: "researching", error: undefined };
  commit();
  let next = company;
  try {
    next = await jobs.run(ws.id, () =>
      jobKeys.run(researchKey(job), () =>
        withTask("Research", () => researchCompany(ws, company, scoringOf(ws.scoring).windowDays))
      )
    );
  } catch (err) {
    // Stopped by a re-calibrate: wait in the queue, run again afterwards.
    if (isPaused(ws.id)) next = { ...company, status: "queued" };
    // Stopped by the founder: back to "not researched yet", no error.
    else if (isPaused(researchKey(job)))
      next = { ...company, status: "candidate", error: undefined };
    else
      next = {
        ...company,
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
      };
  }
  resumeWorkspace(researchKey(job));
  const now = locate(job);
  if (now.icp && now.idx >= 0)
    now.icp.companies[now.idx] = { ...now.icp.companies[now.idx], ...next };
  commit();
  const target = { kind: "company" as const, icpId: job.icpId, domain: job.domain };
  if (next.status === "done")
    notify(
      `${company.name} is researched`,
      `${(next.research?.findings ?? []).filter((f) => f.status === "proven").length} facts proven. Next steps are ready.`,
      target
    );
  else if (next.status === "failed")
    notify(`Research on ${company.name} stopped`, "Open it to try again.", target);
};

const pump = (): void => {
  while (active < WORKERS && queue.length > 0) {
    const job = queue.shift();
    if (!job) break;
    active += 1;
    void work(job).finally(() => {
      active -= 1;
      pump();
    });
  }
};

const researchKey = (job: { icpId: string; domain: string }): string =>
  `research:${job.icpId}:${job.domain}`;
const huntKey = (icpId: string): string => `hunt:${icpId}`;

const enqueue = (wsId: string, icpId: string, domains: string[]): void => {
  for (const domain of domains) {
    if (!queue.some((j) => j.wsId === wsId && j.icpId === icpId && j.domain === domain)) {
      queue.push({ wsId, icpId, domain });
    }
  }
  pump();
};

/** Hunt an ICP: find real matching companies on the web, then research the strong ones. */
const TARGET_STRONG = 3;

/**
 * Hunt an ICP: find candidates on the web and check each against every
 * must-have. If too few pass 70, sharpen the ICP from what failed and search
 * again (up to the product's rounds). Weaker fits are kept but hidden; nothing is deep-
 * researched until the founder approves the fit.
 */
const huntIcp = async (icpId: string): Promise<State> => {
  const ws = activeWorkspace(state);
  const icp = ws?.icps.find((i) => i.id === icpId);
  if (!ws || !icp || icp.sourcing) return state;
  icp.hunted = true;
  icp.sourcing = true;
  icp.sourcingNote = icp.card?.edited
    ? "Turning your card into yes/no checks…"
    : "Searching the web for candidates…";
  commit();
  let checked = 0;
  let passed = 0;
  let failure: string | undefined;
  let gap: string | undefined;
  const now = () => new Date().toISOString();
  icp.hunt = {
    startedAt: now(),
    phase: "search",
    phaseAt: now(),
    round: 1,
    total: 0,
    checked: 0,
    steps: [],
  };
  if (!state.settings.timing) state.settings.timing = { searchMs: 150_000, checkMs: 45_000 };
  const timing = state.settings.timing;
  const ema = (old: number, v: number) => Math.round(old * 0.7 + v * 0.3);
  const checkStart = new Map<string, number>();
  let searchStart = Date.now();
  // Every step the hunt takes, for the live panel and the time estimate.
  const report = (kind: HuntStepKind, text: string, logo?: string) => {
    const h = icp.hunt;
    if (!h) return;
    h.steps = [{ at: now(), kind, text, logo }, ...h.steps].slice(0, 40);
    if (kind === "found") {
      timing.searchMs = ema(timing.searchMs, Date.now() - searchStart);
      h.phase = "check";
      h.phaseAt = now();
      h.total += Number(text.match(/\d+/)?.[0] ?? 0);
    }
    if (kind === "check") checkStart.set(text.replace(/^Checking /, ""), Date.now());
    if (kind === "pass" || kind === "skip") {
      h.checked += 1;
      const name = text.split(" · ")[0] ?? "";
      const t0 = checkStart.get(name);
      if (t0) timing.checkMs = ema(timing.checkMs, Date.now() - t0);
    }
    if (kind === "sharpen") {
      h.phase = "sharpen";
      h.phaseAt = now();
    }
    commit();
    updateDock();
  };
  return jobs.run(ws.id, () =>
    jobKeys.run(huntKey(icpId), () =>
      huntSteps.run(report, () =>
        withTask("Hunting", async () => {
          try {
            if (icp.card?.edited) {
              const gates = await regateIcp(ws.product, icp);
              if (gates) icp.criteria = gates;
              icp.card.edited = false;
              icp.sourcingNote = "Searching the web for candidates…";
              commit();
            }
            const cfg = scoringOf(ws.scoring);
            for (let loop = 0; loop <= cfg.rounds; loop++) {
              const batch: Company[] = [];
              await sourceCompanies(ws, icp, cfg, (co) => {
                co.warm = warmFor(co, state.contacts);
                batch.push(co);
                checked += 1;
                if ((co.match ?? 0) >= cfg.bar) passed += 1;
                // Weaker fits are kept but hidden, so a lower bar later shows them without a new search.
                if (!icp.companies.some((x) => x.domain === co.domain)) icp.companies.push(co);
                icp.sourcingNote = `Checked ${batch.length} companies · ${batch.filter((x) => (x.match ?? 0) >= cfg.bar).length} strong fits`;
                commit();
              });
              const strong = icp.companies.filter(
                (c) => (c.match ?? 0) >= cfg.bar && c.approval !== "rejected"
              ).length;
              const newStrong = batch.filter((c) => (c.match ?? 0) >= cfg.bar).length;
              if (strong >= TARGET_STRONG) break;
              // Stop rule: never pad to hit a count. A round with no new strong fit, or the last
              // round, ends the hunt and says why, instead of burning more searches.
              if (loop === cfg.rounds || batch.length === 0 || (loop > 0 && newStrong === 0)) {
                gap =
                  batch.length === 0
                    ? "The web search found no new companies."
                    : `Found ${strong} of ${TARGET_STRONG} strong fits. ${newStrong === 0 ? "The last round added none, so the hunt stopped to save your AI usage." : "That was the last round."}`;
                break;
              }
              icp.sourcingNote = "Too few strong matches. Sharpening the ICP from what failed…";
              report("sharpen", "Too few strong fits. Sharpening one check");
              const tuned = await refineCriteria(ws.product, icp, batch);
              if (!tuned) break;
              icp.criteria = tuned.criteria;
              icp.refinements = [tuned.change, ...(icp.refinements ?? [])].slice(0, 5);
              icp.sourcingNote = `ICP sharpened: ${tuned.change} Searching again…`;
              commit();
              report("sharpen", tuned.change);
              if (icp.hunt) {
                icp.hunt.round += 1;
                icp.hunt.phase = "search";
                icp.hunt.phaseAt = now();
              }
              searchStart = Date.now();
            }
          } catch (err) {
            // Stopped on purpose (re-calibrate or Stop): not an error worth showing.
            if (!isPaused(ws.id) && !isPaused(huntKey(icpId)))
              failure = err instanceof Error ? err.message : String(err);
          } finally {
            const stopped = isPaused(huntKey(icpId));
            resumeWorkspace(huntKey(icpId));
            icp.sourcing = false;
            icp.sourcingNote = undefined;
            icp.lastHunt = { at: new Date().toISOString(), checked, passed, error: failure, gap };
            commit();
            updateDock();
            if (stopped) {
              // The founder pressed Stop: no notification, the companies found so far stay.
            } else if (failure)
              notify(`Hunt for ${icp.name} stopped`, "Open it to try again.", {
                kind: "icp",
                icpId,
              });
            else
              notify(
                `${icp.name}: ${passed} strong ${passed === 1 ? "fit" : "fits"} found`,
                passed
                  ? `${gap ? `${gap} ` : ""}Approve the ones that fit to start research.`
                  : "The ICP got sharper. Search again.",
                { kind: "icp", icpId }
              );
          }
          return state;
        })
      )
    )
  );
};

/** Check one company for new events and store them. */
const watchOne = async (ws: Workspace, c: Company): Promise<void> => {
  const since =
    c.watchedAt ?? c.trigger?.date ?? new Date(Date.now() - 30 * 86_400_000).toISOString();
  try {
    const found = await jobs.run(ws.id, () =>
      withTask("Daily check", () => watchCompany(ws, c, since))
    );
    const now = new Date().toISOString();
    const have = new Set((c.signals ?? []).map((x) => x.text));
    const fresh = found.filter((f) => !have.has(f.text));
    const icpId = ws.icps.find((i) => i.companies.includes(c))?.id;
    if (fresh.length && icpId)
      notify(`New signal at ${c.name}`, fresh[0]?.text ?? "", {
        kind: "company",
        icpId,
        domain: c.domain,
      });
    c.signals = [
      ...found.filter((f) => !have.has(f.text)).map((f) => ({ ...f, found: now })),
      ...(c.signals ?? []),
    ].slice(0, 30);
    c.watchedAt = now;
  } catch {
    // Try again on the next round.
  }
  commit();
};

// ponytail: the watcher runs only while the app is open; a launchd job could run it daily when closed.
const WATCH_EVERY_MS = 24 * 3_600_000;
/** The listening model, if it belongs to the current provider; otherwise the lightest. */
const listenModel = (): string | undefined => {
  const m = state.settings.listen?.model;
  const provider = state.settings.provider ?? "claude";
  return m && PROVIDER_MODELS[provider].some((x) => x.id === m) ? m : undefined;
};

/** One morning run for a product: every listening profile, at most 10 new posts in total. */
const listenNow = async (ws: Workspace): Promise<number> => {
  const seen = new Set((ws.notices ?? []).map((n) => n.url));
  // First run looks back a week; after that, only since the last run (plus a day of overlap).
  const days = ws.listenedAt
    ? Math.min(7, Math.ceil((Date.now() - Date.parse(ws.listenedAt)) / 86_400_000) + 1)
    : 7;
  const found: Notice[] = [];
  const problems: string[] = [];
  await jobs.run(ws.id, () =>
    withTask("Listening", async () => {
      for (const icp of ws.icps) {
        if (!icp.listen?.on) continue;
        const run = await listenFor(ws.product, icp, seen, days, listenModel()).catch((e) => {
          problems.push(e instanceof Error ? e.message : String(e));
          return { notices: [], problems: [] };
        });
        for (const n of run.notices) seen.add(n.url);
        found.push(...run.notices);
        problems.push(...run.problems);
      }
    })
  );
  // One card per post, even if two profiles or two runs found it.
  const known = new Set((ws.notices ?? []).map((n) => n.url));
  const fresh = found
    .filter((n) => !known.has(n.url) && known.add(n.url))
    .slice(0, MAX_NOTICES_A_DAY);
  // Keep the feed small: newest first, the last 300 posts.
  ws.notices = [...fresh, ...(ws.notices ?? [])].slice(0, 300);
  ws.listenedAt = new Date().toISOString();
  ws.listenProblems = [...new Set(problems)].slice(0, 4);
  commit();
  if (fresh.length) {
    const names = new Map<string, number>();
    for (const n of fresh) {
      const c = ws.icps
        .find((i) => i.id === n.icpId)
        ?.listen?.categories.find((x) => x.id === n.categoryId)?.name;
      if (c) names.set(c, (names.get(c) ?? 0) + 1);
    }
    notify(
      `${fresh.length} ${fresh.length === 1 ? "person" : "people"} noticed`,
      [...names].map(([name, n]) => `${n} ${name.toLowerCase()}`).join(", "),
      { kind: "noticed" }
    );
  }
  return fresh.length;
};

/** Run the morning listening when it is due (checked every 10 minutes while the app is open). */
const listenRound = async (): Promise<void> => {
  const time = state.settings.listen?.time ?? "08:30";
  for (const ws of state.workspaces) {
    if (ws.archived || !ws.icps.some((i) => i.listen?.on)) continue;
    if (listenDue(time, ws.listenedAt)) await listenNow(ws).catch(() => undefined);
  }
};

const watchRound = async (): Promise<void> => {
  for (const ws of state.workspaces)
    for (const icp of ws.icps)
      for (const c of icp.companies) {
        const strong = c.approval === "approved" && c.status === "done";
        const due = !c.watchedAt || Date.now() - Date.parse(c.watchedAt) > WATCH_EVERY_MS;
        if (strong && due) await watchOne(ws, c);
      }
};

const siteOf = (url: string): string => {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

/** Find ICPs again; ICPs with the same name keep their companies. */
const rebuildIcps = async (ws: Workspace, feedback?: string): Promise<void> => {
  const icps = await findIcps(ws.product, feedback);
  for (const icp of icps) {
    const old = ws.icps.find((o) => o.name === icp.name);
    if (old)
      icp.companies = [
        ...old.companies,
        ...icp.companies.filter((c) => !old.companies.some((o) => o.domain === c.domain)),
      ];
    if (old) icp.hunted = old.hunted;
  }
  // An ICP that is gone keeps its place if you approved companies in it.
  const kept = ws.icps.filter(
    (o) =>
      !icps.some((i) => i.name === o.name) && o.companies.some((c) => c.approval === "approved")
  );
  ws.icps = [...icps, ...kept];
};

const busyWork = (ws: Workspace | undefined) => {
  const all = ws?.icps.flatMap((i) => i.companies) ?? [];
  return {
    hunts: ws?.icps.filter((i) => i.sourcing).length ?? 0,
    research: all.filter((c) => c.status === "researching" || c.status === "queued").length,
    actions: all.filter((c) => Object.values(c.actions ?? {}).some((a) => a?.status === "running"))
      .length,
    agent: agent?.current()?.status === "running" || agent?.current()?.status === "waiting",
  };
};

/** Read a LinkedIn export on this Mac and mark every company where the founder knows someone. */
const readExport = async (fileName: string, bytes: Buffer): Promise<State> => {
  let csv: string;
  if (/\.zip$/i.test(fileName)) {
    const { mkdtemp, writeFile, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const dir = await mkdtemp(join(tmpdir(), "icp-net-"));
    try {
      await writeFile(join(dir, "export.zip"), bytes);
      csv = (
        await promisify(execFile)("unzip", ["-p", join(dir, "export.zip"), "Connections.csv"], {
          maxBuffer: 50_000_000,
        }).catch(() => ({ stdout: "" }))
      ).stdout;
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  } else csv = bytes.toString("utf8");
  const contacts = parseConnections(csv);
  if (contacts.length === 0)
    throw new Error("No connections in that file. Use the LinkedIn export ZIP or Connections.csv.");
  state.contacts = contacts;
  state.network = {
    ...state.network,
    linkedin: { ...state.network?.linkedin, importedAt: new Date().toISOString() },
  };
  for (const ws of state.workspaces)
    for (const icp of ws.icps) for (const c of icp.companies) c.warm = warmFor(c, contacts);
  return commit();
};

const peopleRuns = new Set<string>();
/** The product that was open before "New", for the way back out of a setup. */
let lastProduct: string | null = null;
let lastAgentStatus = "";

const ACTION_NAME: Partial<Record<ActionId, string>> = {
  email: "Email",
  linkedin: "LinkedIn note",
  intros: "Warm intros",
  brief: "Call prep brief",
  findEmail: "Email address",
  gmailDraft: "Gmail draft",
};

/** Dock progress across all running hunts. */
const updateDock = (): void => {
  const hunts = state.workspaces.flatMap((w) => w.icps).filter((i) => i.sourcing && i.hunt);
  if (!hunts.length) {
    dockProgress(null);
    return;
  }
  const total = hunts.reduce((n, i) => n + (i.hunt?.total || 15), 0);
  const done = hunts.reduce((n, i) => n + (i.hunt?.checked ?? 0), 0);
  dockProgress(total ? done / total : 0.05);
};

/** Which usage bucket each action counts toward. */
const TASK_OF: Record<string, string> = {
  readProduct: "Setup",
  findIcps: "Setup",
  addIcp: "Setup",
  ideaFinish: "Setup",
  previewBusiness: "Setup",
  updateCard: "Setup",
  huntIcp: "Hunting",
  finishSetup: "Setup",
  approveCompany: "Research",
  researchCompany: "Research",
  runAction: "Next steps",
  watchNow: "Daily check",
  matchPeople: "Your network",
  agentStart: "Browser agent",
  agentReply: "Browser agent",
};

const handlers: Record<string, (...args: never[]) => unknown> = {
  getState: () => state,
  detectAi: () => detectAi(),
  subscriptionStatus: () => accounts.status(),
  beginSubscriptionLogin: (provider: unknown) => {
    if (!isProvider(provider)) throw new Error("Unknown subscription provider.");
    if (state.workspaces.some((ws) => Object.values(busyWork(ws)).some(Boolean)))
      throw new Error("Wait for active work to finish before changing accounts.");
    return accounts.begin(provider);
  },
  subscriptionLoginState: (id: string) => accounts.loginState(id),
  cancelSubscriptionLogin: (id: string) => accounts.cancel(id),
  verifySubscription: async () => {
    const result = await (await createLlm()).generate({
      system: "You are testing a subscription connection. Reply with OK only.",
      prompt: "Connection check.",
      timeoutMs: 60000,
    });
    if (!result.text.trim()) throw new Error("The provider returned no answer.");
    return "Your subscription answered successfully.";
  },
  readProduct: async (url: string) => {
    const product = await readProduct(url);
    // Same site as a workspace you already have: open that one, never a copy.
    const same = state.workspaces.find(
      (w) =>
        w.setupDone && !w.archived && w.product.url && siteOf(w.product.url) === siteOf(product.url)
    );
    if (same) {
      state.workspaces = state.workspaces.filter((w) => w.setupDone || w.id === same.id);
      same.product.logo = product.logo ?? same.product.logo;
      same.product.colors = product.colors ?? same.product.colors;
      state.activeId = same.id;
      return commit();
    }
    let ws = activeWorkspace(state);
    if (!ws || ws.setupDone) {
      ws = {
        id: `ws_${Date.now().toString(36)}`,
        product,
        icps: [],
        setupDone: false,
        createdAt: new Date().toISOString(),
      };
      state.workspaces.push(ws);
      state.activeId = ws.id;
    } else {
      ws.product = product;
    }
    return commit();
  },
  updateProduct: (patch: Partial<Product>) => {
    updateActive(state, (w) => Object.assign(w.product, patch));
    return commit();
  },
  verifyHunter: (key: string) => verifyHunter(key),
  findIcps: async (feedback?: string) => {
    const ws = activeWorkspace(state);
    if (!ws) throw new Error("Add your product first");
    await rebuildIcps(ws, feedback);
    return commit();
  },
  /** Tune this product's matching. Re-scores every company in code: no new searches, no tokens. */
  saveScoring: (patch: Partial<Scoring> | null) => {
    const ws = activeWorkspace(state);
    if (!ws) return state;
    ws.scoring = patch === null ? undefined : { ...ws.scoring, ...patch };
    const cfg = scoringOf(ws.scoring);
    for (const icp of ws.icps)
      for (const c of icp.companies)
        if (c.checks)
          c.match = score(
            {
              checks: c.checks,
              signalConfirmed: c.signalConfirmed ?? /signal confirmed/.test(c.matchWhy ?? ""),
              signalDate: c.trigger?.date,
              dealBreaker:
                c.dealBreaker ?? (c.matchWhy?.startsWith("Deal-breaker") ? c.matchWhy : null),
            },
            cfg
          );
    return commit();
  },
  saveSettings: (patch: Partial<Settings>) => {
    if (patch.provider !== undefined && !isProvider(patch.provider))
      throw new Error("Unknown subscription provider.");
    if (state.workspaces.some((ws) => Object.values(busyWork(ws)).some(Boolean))) {
      if (patch.provider !== undefined || patch.model !== undefined)
        throw new Error(
          "Wait for active work to finish before changing AI subscriptions or models."
        );
    }
    const provider = patch.provider ?? state.settings.provider ?? "claude";
    const previous = state.settings.provider ?? "claude";
    const models = { ...state.settings.providerModels, [previous]: state.settings.model };
    const model =
      patch.model ??
      (provider === previous ? state.settings.model : (models[provider] ?? defaultModel(provider)));
    if (typeof model !== "string" || model.length > 120 || /[\r\n]/.test(model))
      throw new Error("Invalid model name.");
    state.settings = {
      ...state.settings,
      ...patch,
      providerConfirmed: patch.provider !== undefined || state.settings.providerConfirmed === true,
      provider,
      model,
      providerModels: { ...models, [provider]: model },
    };
    setProvider(provider);
    setModel(model);
    setSources(state.settings.sources);
    return commit();
  },
  addIcp: (draft: unknown) => {
    const ws = activeWorkspace(state);
    if (!ws) throw new Error("Add your product first");
    ws.icps.push(
      customIcp(
        draft,
        ws.icps.length,
        ws.product.audience === "Consumers" ? "consumer" : "business"
      )
    );
    return commit();
  },
  updateProfile: (icpId: string, draft: unknown) => {
    const ws = activeWorkspace(state);
    const icp = ws?.icps.find((i) => i.id === icpId);
    if (!ws || !icp) throw new Error("Profile not found.");
    if (icp.sourcing)
      throw new Error("Wait for the current search to finish before editing this profile.");
    const edited = customIcp(
      draft,
      icp.art,
      icp.profileKind ?? (ws.product.audience === "Consumers" ? "consumer" : "business")
    );
    Object.assign(icp, {
      name: edited.name,
      characteristics: edited.characteristics,
      profileKind: edited.profileKind,
      industry: edited.industry,
      size: "",
      pain: edited.pain,
      sellingAngle: edited.sellingAngle,
      signals: edited.signals,
      card: edited.card,
    });
    return commit();
  },
  finishSetup: () => {
    const ws = activeWorkspace(state);
    if (!ws) return state;
    if (!ws.icps.length) throw new Error("Add a customer profile before continuing.");
    ws.setupDone = true;
    return commit();
  },
  /** A written description becomes a product after account connection. */
  ideaFinish: async (description: string) => {
    const product = await readIdea(description);
    let ws = activeWorkspace(state);
    if (!ws || ws.setupDone) {
      ws = {
        id: `ws_${Date.now().toString(36)}`,
        product,
        icps: [],
        setupDone: false,
        createdAt: new Date().toISOString(),
      };
      state.workspaces.push(ws);
      state.activeId = ws.id;
    } else ws.product = product;
    return commit();
  },
  updateCard: (icpId: string, key: keyof Omit<IcpCard, "edited">, text: string) => {
    const icp = activeWorkspace(state)?.icps.find((i) => i.id === icpId);
    if (!icp?.card || !text.trim()) return state;
    icp.card[key] = { text: text.trim(), why: "Your change.", source: "you" };
    icp.card.edited = true;
    if (key === "company") icp.characteristics = text.trim();
    return commit();
  },
  /** Pick the LinkedIn export with a file dialog. */
  importLinkedIn: async () => {
    const pick = await dialog.showOpenDialog({
      title: "Choose your LinkedIn export",
      filters: [{ name: "LinkedIn export", extensions: ["csv", "zip"] }],
      properties: ["openFile"],
    });
    const file = pick.filePaths[0];
    if (pick.canceled || !file) return state;
    const { readFile } = await import("node:fs/promises");
    return readExport(file, await readFile(file));
  },
  /** A dropped LinkedIn export (Connections.csv or the full .zip). Read here, never uploaded. */
  importNetwork: (fileName: string, bytes: ArrayBuffer) => readExport(fileName, Buffer.from(bytes)),
  networkRequested: () => {
    state.network = {
      ...state.network,
      linkedin: { ...state.network?.linkedin, requestedAt: new Date().toISOString() },
    };
    return commit();
  },
  /** The founder signs in to a site once, in IcpFinder's own browser. They type it, not us. */
  openLogin: (url: string) => {
    if (/^https:\/\/(x\.com|www\.reddit\.com|www\.linkedin\.com)\//.test(url)) openLogin(url);
  },
  /** Who in the network is this ICP: profile once, then classify only unknown companies (batched). */
  matchPeople: async (icpId: string, mode: "fast" | "web" | "linkedin" = "fast") => {
    const ws = activeWorkspace(state);
    const icp = ws?.icps.find((i) => i.id === icpId);
    if (!ws || !icp || !state.contacts.length || peopleRuns.has(icpId)) return state;
    peopleRuns.add(icpId);
    try {
      if (!icp.people) {
        icp.people = await profileForIcp(ws.product, icp);
        commit();
      }
      if (!state.companyFacts) state.companyFacts = {};
      const facts = state.companyFacts;
      const todo = companiesToCheck(state.contacts, icp, facts).slice(0, 400);
      for (let i = 0; i < todo.length; i += 80) {
        const batch = todo.slice(i, i + 80);
        Object.assign(facts, await classifyCompanies(batch).catch(() => ({})));
        // A name Claude skipped is marked unknown, so it is never asked again.
        for (const n of batch) facts[normCompany(n)] ??= { industry: "", size: 0 };
        commit();
      }
      // On request: search the web for companies still unknown (25 per run, at most 100 a click).
      if (mode === "web") {
        const unknown = companiesToSearch(state.contacts, icp, facts).slice(0, 100);
        for (let i = 0; i < unknown.length; i += 25) {
          const batch = unknown.slice(i, i + 25);
          Object.assign(facts, await classifyCompanies(batch, true).catch(() => ({})));
          for (const n of batch) {
            const k = normCompany(n);
            facts[k] = { ...(facts[k] ?? { industry: "", size: 0 }), web: true };
          }
          commit();
        }
      }
      // On request: read company pages on LinkedIn in the founder's own browser (30 a click, 8 per run).
      if (mode === "linkedin") {
        const todo2 = companiesForLinkedIn(state.contacts, icp, facts).slice(0, 30);
        for (let i = 0; i < todo2.length; i += 8) {
          const batch = todo2.slice(i, i + 8);
          const got = await linkedinFacts(batch).catch(() => ({}) as Record<string, CompanyFacts>);
          for (const n of batch) {
            const k = normCompany(n);
            facts[k] = {
              ...(facts[k] ?? { industry: "", size: 0 }),
              ...(got[k] ?? {}),
              linkedin: true,
            };
          }
          commit();
        }
      }
    } finally {
      peopleRuns.delete(icpId);
    }
    return state;
  },
  /** Plan limits as Claude Code reports them (no tokens used). */
  planUsage: async () => {
    if ((state.settings.provider ?? "claude") !== "claude") return null;
    const plan = await readClaudePlan((await which("claude")) ?? "claude");
    if (!plan) return plan;
    // Split each window: IcpFinder's own runs vs everything else Claude Code ran on this Mac.
    const windows = await Promise.all(
      plan.windows.map(async (w) => {
        const start = windowStart(w.label, w.resets);
        if (!start) return w;
        const mine = appWeight(start);
        const other = await localWeight(start).catch(() => undefined);
        return {
          ...w,
          appPct:
            other === undefined || !(mine + other) ? undefined : (w.pct * mine) / (mine + other),
        };
      })
    );
    return { ...plan, windows };
  },
  deleteNetwork: () => {
    state.contacts = [];
    state.network = {};
    state.companyFacts = {};
    for (const ws of state.workspaces)
      for (const icp of ws.icps) for (const c of icp.companies) c.warm = undefined;
    return commit();
  },
  huntIcp: (icpId: string) => huntIcp(icpId),
  updateCriteria: (icpId: string, criteria: IcpCriteria) => {
    const icp = activeWorkspace(state)?.icps.find((i) => i.id === icpId);
    if (icp) icp.criteria = criteria;
    return commit();
  },
  approveCompany: (icpId: string, domain: string, ok: boolean) => {
    const ws = activeWorkspace(state);
    const c = ws?.icps.find((i) => i.id === icpId)?.companies.find((x) => x.domain === domain);
    if (!ws || !c) return state;
    c.approval = ok ? "approved" : "rejected";
    if (ok && (c.status === "candidate" || c.status === "failed")) {
      c.status = "queued";
      commit();
      enqueue(ws.id, icpId, [domain]);
    }
    return commit();
  },
  /** Stop one hunt; the companies it found so far stay. */
  stopHunt: (icpId: string) => {
    if (activeWorkspace(state)?.icps.some((i) => i.id === icpId && i.sourcing))
      pauseWorkspace(huntKey(icpId));
    return state;
  },
  /** Stop one company's research, or take it out of the queue. */
  stopResearch: (icpId: string, domain: string) => {
    const ws = activeWorkspace(state);
    const c = ws?.icps.find((i) => i.id === icpId)?.companies.find((x) => x.domain === domain);
    if (!ws || !c) return state;
    const i = queue.findIndex((j) => j.wsId === ws.id && j.icpId === icpId && j.domain === domain);
    if (i >= 0) {
      queue.splice(i, 1);
      c.status = "candidate";
      commit();
    } else if (c.status === "researching") pauseWorkspace(researchKey({ icpId, domain }));
    return state;
  },
  researchCompany: (icpId: string, domain: string) => {
    const ws = activeWorkspace(state);
    if (ws) enqueue(ws.id, icpId, [domain]);
    return state;
  },
  runAction: async (icpId: string, domain: string, action: ActionId) => {
    const ws = activeWorkspace(state);
    const c = ws?.icps.find((i) => i.id === icpId)?.companies.find((x) => x.domain === domain);
    if (!ws || !c) return state;
    c.actions = { ...c.actions, [action]: { status: "running", at: new Date().toISOString() } };
    commit();
    try {
      const text = await jobs.run(ws.id, () =>
        runCompanyAction(ws, c, action, state.settings.hunterKey)
      );
      c.actions = {
        ...c.actions,
        [action]: { status: "done", text, at: new Date().toISOString() },
      };
      notify(`${ACTION_NAME[action] ?? "Next step"} ready`, c.name, {
        kind: "company",
        icpId,
        domain,
      });
    } catch (err) {
      c.actions = {
        ...c.actions,
        [action]: {
          status: "failed",
          text: err instanceof Error ? err.message : String(err),
          at: new Date().toISOString(),
        },
      };
    }
    return commit();
  },
  watchNow: async (icpId: string, domain: string) => {
    const ws = activeWorkspace(state);
    const c = ws?.icps.find((i) => i.id === icpId)?.companies.find((x) => x.domain === domain);
    if (ws && c) await watchOne(ws, c);
    return state;
  },
  markSeen: (icpId: string, domain: string) => {
    const c = activeWorkspace(state)
      ?.icps.find((i) => i.id === icpId)
      ?.companies.find((x) => x.domain === domain);
    for (const sig of c?.signals ?? []) sig.seen = true;
    return commit();
  },
  saveLinkedIn: (icpId: string, domain: string, url: string | null) => {
    const c = activeWorkspace(state)
      ?.icps.find((i) => i.id === icpId)
      ?.companies.find((x) => x.domain === domain);
    const clean = url?.trim().replace(/^http:\/\//, "https://");
    if (c && !clean) c.linkedin = undefined;
    else if (c && clean && LINKEDIN.test(clean)) c.linkedin = clean;
    return commit();
  },
  /** Where to reach them: code only, no AI, so it can run whenever the page opens. */
  findReach: async (icpId: string, domain: string) => {
    const c = activeWorkspace(state)
      ?.icps.find((i) => i.id === icpId)
      ?.companies.find((x) => x.domain === domain);
    if (!c) return state;
    c.reach = await findReach(c);
    c.reachAt = new Date().toISOString();
    return commit();
  },
  copyText: (text: string) => {
    if (typeof text === "string") clipboard.writeText(text);
  },
  /** Suggest what to listen for, for every profile that has no listening yet (one AI call each). */
  listenSuggest: async () => {
    const ws = activeWorkspace(state);
    if (!ws) return state;
    await jobs.run(ws.id, () =>
      withTask("Listening", async () => {
        for (const icp of ws.icps) {
          if (icp.listen || icp.profileKind === "consumer") continue;
          icp.listen = await suggestListen(ws.product, icp, listenModel());
          commit();
        }
      })
    );
    return commit();
  },
  listenSave: (icpId: string, listen: Listen) => {
    const icp = activeWorkspace(state)?.icps.find((i) => i.id === icpId);
    if (icp) icp.listen = listen;
    return commit();
  },
  listenRun: async () => {
    const ws = activeWorkspace(state);
    if (ws) await listenNow(ws);
    return state;
  },
  /** Saved, seen or not relevant. Not relevant teaches the check what to skip next time. */
  noticeSet: (id: string, status: Notice["status"]) => {
    const ws = activeWorkspace(state);
    const n = ws?.notices?.find((x) => x.id === id);
    if (!ws || !n) return state;
    n.status = status;
    const l = ws.icps.find((i) => i.id === n.icpId)?.listen;
    if (status === "dismissed" && l)
      l.rejected = [n.quote.slice(0, 140), ...(l.rejected ?? [])].slice(0, 15);
    return commit();
  },
  openExternal: (url: string) => {
    if (/^https:\/\//.test(url)) void shell.openExternal(url);
  },
  agentStart: (task: string, startUrl?: string) => agent?.start(task, startUrl),
  /** The founder answers Claude: continue the same session with the whole context. */
  agentReply: (text: string) => agent?.reply(text),
  agentStop: () => agent?.stop(),
  agentAnswer: (ok: boolean, reason?: string) => agent?.answer(ok, reason),
  agentBounds: (rect: { x: number; y: number; width: number; height: number } | null) =>
    agent?.setBounds(rect),
  agentCurrent: () => agent?.current() ?? null,
  agentThumb: () => agent?.thumb() ?? null,
  /** What re-calibrate would stop right now in the active workspace. */
  busyWork: () => busyWork(activeWorkspace(state)),
  // Read-only proposal: never overwrite corrections or regenerate existing profiles.
  previewBusiness: async () => {
    const ws = activeWorkspace(state);
    if (!ws?.product.url || !/^https?:\/\//.test(ws.product.url))
      throw new Error("This business has no website. Edit its overview instead.");
    return readProduct(ws.product.url);
  },
  /** Hide a workspace (data stays on disk). Never the last one. */
  archiveWorkspace: (id: string) => {
    const live = state.workspaces.filter((w) => w.setupDone && !w.archived);
    const w = live.find((x) => x.id === id);
    if (!w || live.length < 2) return state;
    w.archived = true;
    if (state.activeId === id) state.activeId = live.find((x) => x.id !== id)?.id ?? null;
    return commit();
  },
  newWorkspace: () => {
    if (state.activeId) lastProduct = state.activeId;
    state.activeId = null;
    return commit();
  },
  /** Leave a new setup and go back to the products you already have. Nothing is deleted. */
  cancelSetup: () => {
    const done = state.workspaces.filter((w) => w.setupDone && !w.archived);
    const back = done.find((w) => w.id === lastProduct) ?? done[done.length - 1];
    if (back) state.activeId = back.id;
    return commit();
  },
  switchWorkspace: (id: string) => {
    if (state.workspaces.some((w) => w.id === id)) state.activeId = id;
    return commit();
  },
};

const createWindow = (): void => {
  win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1100,
    minHeight: 700,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 18, y: 18 },
    // Native macOS sidebar material behind the transparent sidebar.
    vibrancy: "sidebar",
    visualEffectState: "followWindow",
    backgroundColor: "#00000000",
    title: "IcpFinder",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true,
    },
  });
  initNotify(win);
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) void shell.openExternal(url);
    return { action: "deny" };
  });
  agent = new BrowserAgent(
    win,
    (r) => {
      win?.webContents.send("agent", r);
      if (r && r.status !== lastAgentStatus) {
        if (r.status === "waiting")
          notify("Your AI needs your OK", r.ask?.action ?? "", { kind: "agent" });
        if (r.status === "done") notify("Browser task done", r.goal ?? r.task, { kind: "agent" });
        lastAgentStatus = r.status;
      }
    },
    async () => {
      const bin = await resolveCli("claude");
      if (!bin) throw new Error("Claude Code is no longer installed.");
      return bin;
    }
  );
  if (process.env.ELECTRON_RENDERER_URL) void win.loadURL(process.env.ELECTRON_RENDERER_URL);
  else void win.loadFile(join(__dirname, "../renderer/index.html"));
};

app.setName("IcpFinder");
// Dock icon while running from source (a packaged build uses its own icon).
app.whenReady().then(() => {
  if (process.platform === "darwin" && !app.isPackaged)
    app.dock?.setIcon(join(__dirname, "../../resources/icon.png"));
});
// Tests and power users can point the data folder elsewhere.
if (process.env.ICPFINDER_DATA_DIR) app.setPath("userData", process.env.ICPFINDER_DATA_DIR);

app.whenReady().then(() => {
  state = loadState(file());
  const runtimeDirectory = join(app.getPath("userData"), "ai-runtime");
  mkdirSync(runtimeDirectory, { recursive: true, mode: 0o700 });
  accounts = new SubscriptionAuth({
    root: app.getPath("userData"),
    openExternal: (url) => shell.openExternal(url),
    encryptionAvailable: () => safeStorage.isEncryptionAvailable(),
    encrypt: (value) => safeStorage.encryptString(value.toString("utf8")),
    decrypt: (value) => Buffer.from(safeStorage.decryptString(value), "utf8"),
  });
  configureSubscriptions(accounts, runtimeDirectory);
  setProvider(state.settings.provider ?? "claude");
  setModel(state.settings.model);
  setSources(state.settings.sources);
  // Onboarding is writing-only; the app does not request device permissions.
  session.defaultSession.setPermissionRequestHandler((_wc, _permission, ok) => ok(false));
  initUsage(
    state.usage ?? [],
    (rows) => {
      state.usage = rows;
      commit();
    },
    () => jobs.getStore() ?? state.activeId ?? undefined,
    state.usageRecent ?? [],
    (r) => {
      state.usageRecent = r;
    }
  );
  initLocalUsage(join(app.getPath("userData"), "local-usage-cache.json"));
  for (const [name, fn] of Object.entries(handlers)) {
    ipcMain.handle(name, (_e, ...args: unknown[]) =>
      withTask(TASK_OF[name] ?? "Other", async () => (fn as (...a: unknown[]) => unknown)(...args))
    );
  }
  // Resume work that was cut off by a quit.
  for (const ws of state.workspaces)
    for (const icp of ws.icps) {
      if (icp.sourcing) {
        icp.sourcing = false;
        icp.sourcingNote = undefined;
        icp.lastHunt = {
          at: new Date().toISOString(),
          checked: 0,
          passed: 0,
          error: "The app closed during the search.",
        };
      }
      for (const c of icp.companies) {
        if (c.status === "researching") c.status = "queued";
        // A next step cut off by a quit must not spin forever.
        for (const r of Object.values(c.actions ?? {}))
          if (r?.status === "running") {
            r.status = "failed";
            r.text = "Stopped when the app closed. Try again.";
          }
      }
    }
  for (const ws of state.workspaces)
    for (const icp of ws.icps)
      if (icp.hunted)
        enqueue(
          ws.id,
          icp.id,
          icp.companies
            .filter(
              (c) =>
                c.status === "queued" &&
                (c.match === undefined || c.match >= scoringOf(ws.scoring).bar)
            )
            .map((c) => c.domain)
        );
  // Older copies of the same site (made before the check above) are hidden, not deleted.
  const keep = new Map<string, string>();
  for (const w of [...state.workspaces].reverse())
    if (w.setupDone && !w.archived) {
      if (!w.product.url) continue;
      const site = siteOf(w.product.url);
      const kept = keep.get(site);
      if (!kept) keep.set(site, w.id);
      else if (w.id === state.activeId) {
        const other = state.workspaces.find((x) => x.id === kept);
        if (other) other.archived = true;
        keep.set(site, w.id);
      } else w.archived = true;
    }
  commit();
  createWindow();
  // Backfill product logos too.
  void (async () => {
    for (const ws of state.workspaces)
      if (!ws.product.logo && !ws.archived && ws.product.url) {
        ws.product.logo = await companyLogo(siteOf(ws.product.url));
        if (ws.product.logo) commit();
      }
  })();
  // Backfill logos for companies found before logos existed.
  void (async () => {
    for (const ws of state.workspaces)
      for (const icp of ws.icps)
        for (const c of icp.companies)
          if (!c.logo && (c.match ?? 0) >= scoringOf(ws.scoring).bar && c.approval !== "rejected") {
            c.logo = await companyLogo(c.domain);
            if (c.logo) commit();
          }
  })();
  setTimeout(() => void watchRound(), 60_000);
  setInterval(() => void watchRound(), 3_600_000);
  setTimeout(() => void listenRound(), 90_000);
  setInterval(() => void listenRound(), 600_000);
});

app.on("window-all-closed", () => app.quit());
