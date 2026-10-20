// SPDX-License-Identifier: MIT
//
// A quiet, read-only reader that opens pages in IcpFinder's own browser
// profile (the same one the live agent uses, so the founder's logins work).
// One page at a time, human pace. Used for sites that block AI fetches and
// for social search pages. Never clicks, types or posts anything.

import { BrowserWindow } from "electron";

export const PARTITION = "persist:icpfinder-agent";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

let chain: Promise<unknown> = Promise.resolve();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Visible text of a page after it settles. Queued: one page at a time, with a pause between. */
export const browseText = (url: string, settleMs = 2500): Promise<string> => {
  const job = chain.then(async () => {
    const win = new BrowserWindow({
      show: false,
      width: 1280,
      height: 1600,
      webPreferences: { partition: PARTITION, offscreen: false, javascript: true, images: false },
    });
    try {
      await Promise.race([
        win.loadURL(url, { userAgent: UA }),
        sleep(20_000).then(() => {
          throw new Error("page timed out");
        }),
      ]);
      await sleep(settleMs);
      await win.webContents.executeJavaScript("window.scrollTo(0, document.body.scrollHeight / 2)");
      await sleep(1200);
      const text = (await win.webContents.executeJavaScript(
        "document.body ? document.body.innerText : ''"
      )) as string;
      return text.replace(/\n{3,}/g, "\n\n").slice(0, 20_000);
    } finally {
      win.destroy();
      await sleep(1500 + Math.random() * 1500);
    }
  });
  chain = job.catch(() => undefined);
  return job;
};

/** True when a page is clearly a login or block wall, not content. */
export const isWall = (text: string): boolean =>
  text.length < 400 ||
  /sign in to|log in to|create an account|you've been blocked|access denied|unusual traffic|verify you are human/i.test(
    text.slice(0, 1500)
  );

/** Let the founder sign in once to a site inside IcpFinder's browser (they type it, not us). */
export const openLogin = (url: string): void => {
  const win = new BrowserWindow({
    width: 980,
    height: 760,
    title: "Sign in · IcpFinder browser",
    webPreferences: { partition: PARTITION },
  });
  void win.loadURL(url, { userAgent: UA });
};
