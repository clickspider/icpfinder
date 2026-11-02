// SPDX-License-Identifier: MIT
//
// Tells the founder when work is done while they are away: a Mac notification,
// a Dock badge with the count of new results, and the Dock progress bar during
// hunts. Clicking a notification opens the right ICP or company.

import { app, type BrowserWindow, Notification } from "electron";

export type Target =
  | { kind: "icp"; icpId: string }
  | { kind: "company"; icpId: string; domain: string }
  | { kind: "agent" }
  | { kind: "noticed" };

let win: BrowserWindow | null = null;
let unseen = 0;

export const initNotify = (w: BrowserWindow): void => {
  win = w;
  w.on("focus", () => {
    unseen = 0;
    app.dock?.setBadge("");
  });
};

/** Tell the founder something finished. Quiet while they are looking at the app. */
export const notify = (title: string, body: string, target?: Target): void => {
  if (!win || win.isDestroyed() || win.isFocused()) return;
  unseen += 1;
  app.dock?.setBadge(String(unseen));
  if (!Notification.isSupported()) return;
  const n = new Notification({ title, body, silent: false });
  n.on("click", () => {
    if (!win || win.isDestroyed()) return;
    win.show();
    win.focus();
    if (target) win.webContents.send("navigate", target);
  });
  n.show();
};

/** Dock progress for running hunts: 0..1, or null to hide. */
export const dockProgress = (fraction: number | null): void => {
  if (!win || win.isDestroyed()) return;
  win.setProgressBar(fraction === null ? -1 : Math.max(0.02, Math.min(1, fraction)));
};
