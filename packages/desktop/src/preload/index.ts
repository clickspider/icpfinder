// SPDX-License-Identifier: MIT

import { contextBridge, ipcRenderer } from "electron";
import type { AgentRun, IcpApi, State } from "../shared/types";

const call =
  (name: string) =>
  (...args: unknown[]) =>
    ipcRenderer.invoke(name, ...args);

const api: IcpApi = {
  subscriptionStatus: call("subscriptionStatus") as IcpApi["subscriptionStatus"],
  beginSubscriptionLogin: call("beginSubscriptionLogin") as IcpApi["beginSubscriptionLogin"],
  subscriptionLoginState: call("subscriptionLoginState") as IcpApi["subscriptionLoginState"],
  cancelSubscriptionLogin: call("cancelSubscriptionLogin") as IcpApi["cancelSubscriptionLogin"],
  verifySubscription: call("verifySubscription") as IcpApi["verifySubscription"],
  getState: call("getState") as IcpApi["getState"],
  detectAi: call("detectAi") as IcpApi["detectAi"],
  readProduct: call("readProduct") as IcpApi["readProduct"],
  updateProduct: call("updateProduct") as IcpApi["updateProduct"],
  verifyHunter: call("verifyHunter") as IcpApi["verifyHunter"],
  findIcps: call("findIcps") as IcpApi["findIcps"],
  saveScoring: call("saveScoring") as IcpApi["saveScoring"],
  ideaFinish: call("ideaFinish") as IcpApi["ideaFinish"],
  updateCard: call("updateCard") as IcpApi["updateCard"],
  importLinkedIn: call("importLinkedIn") as IcpApi["importLinkedIn"],
  importNetwork: call("importNetwork") as IcpApi["importNetwork"],
  networkRequested: call("networkRequested") as IcpApi["networkRequested"],
  deleteNetwork: call("deleteNetwork") as IcpApi["deleteNetwork"],
  matchPeople: call("matchPeople") as IcpApi["matchPeople"],
  planUsage: call("planUsage") as IcpApi["planUsage"],
  openLogin: call("openLogin") as IcpApi["openLogin"],
  busyWork: call("busyWork") as IcpApi["busyWork"],
  recalibrate: call("recalibrate") as IcpApi["recalibrate"],
  archiveWorkspace: call("archiveWorkspace") as IcpApi["archiveWorkspace"],
  saveSettings: call("saveSettings") as IcpApi["saveSettings"],
  finishSetup: call("finishSetup") as IcpApi["finishSetup"],
  huntIcp: call("huntIcp") as IcpApi["huntIcp"],
  updateCriteria: call("updateCriteria") as IcpApi["updateCriteria"],
  approveCompany: call("approveCompany") as IcpApi["approveCompany"],
  researchCompany: call("researchCompany") as IcpApi["researchCompany"],
  runAction: call("runAction") as IcpApi["runAction"],
  watchNow: call("watchNow") as IcpApi["watchNow"],
  markSeen: call("markSeen") as IcpApi["markSeen"],
  openExternal: call("openExternal") as IcpApi["openExternal"],
  newWorkspace: call("newWorkspace") as IcpApi["newWorkspace"],
  switchWorkspace: call("switchWorkspace") as IcpApi["switchWorkspace"],
  agentStart: call("agentStart") as IcpApi["agentStart"],
  agentReply: call("agentReply") as IcpApi["agentReply"],
  cancelSetup: call("cancelSetup") as IcpApi["cancelSetup"],
  agentStop: call("agentStop") as IcpApi["agentStop"],
  agentAnswer: call("agentAnswer") as IcpApi["agentAnswer"],
  agentBounds: call("agentBounds") as IcpApi["agentBounds"],
  agentCurrent: call("agentCurrent") as IcpApi["agentCurrent"],
  onAgent: (cb) => {
    const fn = (_e: unknown, r: AgentRun | null) => cb(r);
    ipcRenderer.on("agent", fn);
    return () => ipcRenderer.removeListener("agent", fn);
  },
  onNavigate: (cb) => {
    const fn = (_e: unknown, t: { kind: string; icpId?: string; domain?: string }) => cb(t);
    ipcRenderer.on("navigate", fn);
    return () => ipcRenderer.removeListener("navigate", fn);
  },
  onState: (cb) => {
    const fn = (_e: unknown, s: State) => cb(s);
    ipcRenderer.on("state", fn);
    return () => ipcRenderer.removeListener("state", fn);
  },
};

contextBridge.exposeInMainWorld("icp", api);
