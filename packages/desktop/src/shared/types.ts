// SPDX-License-Identifier: MIT
//
// The IcpFinder data model: one workspace = one product.
// product → many ICPs → many companies → research (proof + strategy).

import type { AccountResearch } from "@icpfinder/core";

export interface Product {
  url: string;
  name: string;
  sell: string;
  problem: string;
  different: string;
  price: string;
  /** Visible text of the product site, used as context for every hunt. */
  siteText: string;
  readAt: string;
  /** Site icon as a data URL. */
  logo?: string;
  /** Up to 3 brand colors from the site, primary first. */
  colors?: string[];
  audience?: Audience;
  progress?: BusinessProgress;
  marketplace?: boolean;
  confirmedFields?: string[];
  /** Legacy funding/model answers: retained for compatibility, not used as progress. */
  model?: BusinessModel;
  stage?: Stage;
  /** Known competitors or today's way; sharpens the ICP and the price guess. */
  competitors?: string;
}

export type Audience = "Businesses" | "Consumers" | "Both";
export type BusinessProgress =
  | "Exploring an idea"
  | "Preparing to launch"
  | "Looking for first customers"
  | "Already serving customers";
export type BusinessModel = "B2B" | "B2C" | "B2B2C" | "Marketplace";
export type Stage = "Idea" | "Pre-seed" | "Seed" | "Series A+";

/** One line of the ICP card, with why we suggest it and where that comes from. */
export interface CardLine {
  text: string;
  why: string;
  /** "pricing page", "homepage", … or "gtmskills: <method>". */
  source: string;
}

/** The four calls that make an ICP sharp. */
export interface IcpCard {
  buyer: CardLine;
  company: CardLine;
  trigger: CardLine;
  skip: CardLine;
  /** True when the founder changed a line; the yes/no gates are rebuilt before the hunt. */
  edited?: boolean;
}

/** A person from the founder's own network (LinkedIn export), kept on this Mac only. */
export interface Contact {
  name: string;
  company: string;
  position: string;
  url?: string;
}

/** candidate = found and scored, waiting for the founder to approve its fit. */
export type CompanyStatus = "candidate" | "queued" | "researching" | "done" | "failed";

export interface Company {
  /** People the founder knows here, from their own network export. */
  warm?: Contact[];
  /** Score inputs kept so a new matching setup can re-score without new searches. */
  signalConfirmed?: boolean;
  dealBreaker?: string;
  domain: string;
  name: string;
  /** The model's first guess from the ICP step, not proven. */
  hint?: string;
  status: CompanyStatus;
  research?: AccountResearch;
  error?: string;
  /** Company site icon as a data URL. */
  logo?: string;
  /** The founder's call on the fit; deep research runs only after "approved". */
  approval?: "approved" | "rejected";
  /** How well it matches the ICP criteria, 0-100 (from the sourcing pass). */
  match?: number;
  /** One line: why it matches. */
  matchWhy?: string;
  /** Each must-have checked for this company. */
  checks?: Array<{ criterion: string; verdict: "yes" | "no" | "unknown"; evidence?: string }>;
  /** The buying signal that got it picked, with its source. */
  trigger?: Trigger;
  /** New events found by the watcher, newest first. */
  signals?: Array<Trigger & { found: string; seen?: boolean }>;
  /** Last time the watcher checked this company. */
  watchedAt?: string;
  /** Results of next-step actions, by action id. */
  actions?: Partial<Record<ActionId, ActionResult>>;
}

export type ActionId = "email" | "linkedin" | "intros" | "brief" | "findEmail" | "gmailDraft";

export interface ActionResult {
  status: "running" | "done" | "failed";
  text?: string;
  at: string;
}

export interface IcpDraft {
  title: string;
  tag: string;
  fit: string;
  buyer: string;
  signal: string;
  skip: string;
}

export interface Icp {
  id: string;
  name: string;
  industry: string;
  size: string;
  pain: string;
  reasoning?: string;
  sellingAngle?: string;
  signals: string[];
  objections: string[];
  /** 0 = red stripes, 1 = purple, 2 = orange, … (art in the launcher). */
  art: number;
  hunted: boolean;
  /** Concrete filters that make the ICP precise; editable by the founder. */
  criteria?: IcpCriteria;
  card?: IcpCard;
  /** Who in the founder's network is this buyer (made once by Claude, then plain code). */
  people?: import("./people").PersonProfile;
  /** True while Claude searches the web for matching companies. */
  sourcing?: boolean;
  /** Live progress of the hunt, e.g. "Checking 6 of 14". */
  sourcingNote?: string;
  /** Companies found but under the 70 bar; counted, not shown. */
  belowBar?: number;
  /** How the ICP was sharpened by the hunting loop, newest first. */
  refinements?: string[];
  /** The live (or last) hunt, step by step, for the progress panel. */
  hunt?: HuntProgress;
  /** How the last hunt ended, so an empty list can say why. */
  lastHunt?: { at: string; checked: number; passed: number; error?: string };
  companies: Company[];
}

export type HuntStepKind = "search" | "source" | "found" | "check" | "pass" | "skip" | "sharpen";

export interface HuntStep {
  at: string;
  kind: HuntStepKind;
  text: string;
  logo?: string;
}

export interface HuntProgress {
  startedAt: string;
  phase: "search" | "check" | "sharpen";
  phaseAt: string;
  round: number;
  total: number;
  checked: number;
  steps: HuntStep[];
}

export interface IcpCriteria {
  mustHave: string[];
  signals: string[];
  dealBreakers: string[];
}

export interface Trigger {
  text: string;
  url?: string;
  date?: string;
}

export interface Workspace {
  id: string;
  product: Product;
  icps: Icp[];
  setupDone: boolean;
  createdAt: string;
  /** Hidden duplicate of another workspace for the same site. Kept on disk, never deleted. */
  archived?: boolean;
  /** This product's own matching setup (bar, weights, freshness, search depth). */
  scoring?: Partial<import("./scoring").Scoring>;
  /** True while re-calibrate runs; other Claude work for this product is stopped. */
  recalibrating?: boolean;
}

export interface Settings {
  provider?: import("./subscriptions").ProviderId;
  providerConfirmed?: boolean;
  providerModels?: Partial<Record<import("./subscriptions").ProviderId, string>>;
  hunterKey: string;
  windowDays: number;
  dropTime: string;
  askBeforeEmail: boolean;
  /** Claude model alias: sonnet, opus or haiku. */
  model: string;
  /** Learned step times (ms), for the hunt's time estimate. */
  timing?: { searchMs: number; checkMs: number };
  /** Where hunts look for buying signals, and whether blocked pages use the app's browser. */
  sources: Sources;
}

export interface Sources {
  hn: boolean;
  reddit: boolean;
  x: boolean;
  linkedin: boolean;
  /** Read pages that block AI fetches in IcpFinder's own browser instead. */
  fallback: boolean;
  /** Social pages: IcpFinder's own browser, or the founder's browser through Claude in Chrome. */
  browser?: "app" | "yours";
}

export interface State {
  workspaces: Workspace[];
  activeId: string | null;
  settings: Settings;
  /** The founder's network, imported from their own LinkedIn export. */
  contacts: Contact[];
  /** Size and industry of contacts' companies, keyed by normalized name. Filled once, kept. */
  companyFacts?: Record<string, import("./people").CompanyFacts>;
  /** What IcpFinder used from the founder's AI plan, per day, product, task and model. */
  usage?: import("./usage").UsageRow[];
  usageRecent?: Array<{ at: number; w: number }>;
  network?: { linkedin?: { requestedAt?: string; importedAt?: string } };
}

export interface AiTool {
  name: "Claude Code" | "Codex";
  found: boolean;
  path: string | null;
  version: string | null;
}

/** The API the preload script exposes on window.icp. */
export interface IcpApi {
  getState(): Promise<State>;
  detectAi(): Promise<AiTool[]>;
  subscriptionStatus(): Promise<import("./subscriptions").SubscriptionStatus[]>;
  beginSubscriptionLogin(
    provider: import("./subscriptions").ProviderId
  ): Promise<import("./subscriptions").LoginAttempt>;
  subscriptionLoginState(id: string): Promise<import("./subscriptions").LoginAttempt>;
  cancelSubscriptionLogin(id: string): Promise<void>;
  verifySubscription(): Promise<string>;
  readProduct(url: string): Promise<State>;
  updateProduct(patch: Partial<Product>): Promise<State>;
  findIcps(feedback?: string): Promise<State>;
  addIcp(draft: IcpDraft): Promise<State>;
  saveScoring(patch: Partial<import("./scoring").Scoring> | null): Promise<State>;
  ideaFinish(description: string): Promise<State>;
  updateCard(
    icpId: string,
    key: "buyer" | "company" | "trigger" | "skip",
    text: string
  ): Promise<State>;
  importLinkedIn(): Promise<State>;
  importNetwork(fileName: string, bytes: ArrayBuffer): Promise<State>;
  networkRequested(): Promise<State>;
  deleteNetwork(): Promise<State>;
  matchPeople(icpId: string, mode?: "fast" | "web" | "linkedin"): Promise<State>;
  planUsage(): Promise<import("./usage").PlanUsage | null>;
  openLogin(url: string): Promise<void>;
  busyWork(): Promise<{ hunts: number; research: number; actions: number; agent: boolean }>;
  recalibrate(): Promise<State>;
  archiveWorkspace(id: string): Promise<State>;
  verifyHunter(
    key: string
  ): Promise<{ ok: boolean; email?: string; plan?: string; searchesLeft?: number; error?: string }>;
  saveSettings(patch: Partial<Settings>): Promise<State>;
  finishSetup(icpId?: string): Promise<State>;
  updateCriteria(icpId: string, criteria: IcpCriteria): Promise<State>;
  huntIcp(icpId: string): Promise<State>;
  researchCompany(icpId: string, domain: string): Promise<State>;
  approveCompany(icpId: string, domain: string, ok: boolean): Promise<State>;
  runAction(icpId: string, domain: string, action: ActionId): Promise<State>;
  watchNow(icpId: string, domain: string): Promise<State>;
  markSeen(icpId: string, domain: string): Promise<State>;
  openExternal(url: string): Promise<void>;
  newWorkspace(): Promise<State>;
  switchWorkspace(id: string): Promise<State>;
  onState(cb: (s: State) => void): () => void;
  agentStart(task: string, startUrl?: string): Promise<AgentRun>;
  agentReply(text: string): Promise<AgentRun>;
  cancelSetup(): Promise<State>;
  onNavigate(cb: (t: { kind: string; icpId?: string; domain?: string }) => void): () => void;
  agentStop(): Promise<void>;
  agentAnswer(ok: boolean, reason?: string): Promise<void>;
  agentBounds(rect: { x: number; y: number; width: number; height: number } | null): Promise<void>;
  agentCurrent(): Promise<AgentRun | null>;
  onAgent(cb: (r: AgentRun | null) => void): () => void;
}

export interface AgentStep {
  at: string;
  kind: "open" | "read" | "click" | "type" | "scroll" | "look" | "ask" | "say" | "done" | "error";
  text: string;
}

export interface AgentRun {
  id: string;
  task: string;
  /** The first task of this session; follow-ups keep it so Claude never loses why it started. */
  goal?: string;
  status: "running" | "waiting" | "done" | "stopped" | "failed";
  steps: AgentStep[];
  ask?: { action: string; preview?: string };
  url?: string;
}
