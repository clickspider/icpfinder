// SPDX-License-Identifier: MIT
//
// IcpFinder for Chrome: the Mac app asks for a few search pages; this reads
// them in the founder's own browser, where they are signed in, and sends the
// visible text back. Read only. It opens each page in a small background
// window, waits for it to load, copies the text, closes it. Nothing else.

const APP = "http://127.0.0.1:47321";
const HEADERS = { "x-icpfinder-extension": chrome.runtime.id };
const SITES = /^https:\/\/(www\.reddit\.com|x\.com|www\.linkedin\.com)\//;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

chrome.alarms.create("poll", { periodInMinutes: 0.5 });
chrome.alarms.onAlarm.addListener(() => void poll());
chrome.runtime.onStartup.addListener(() => void poll());
chrome.runtime.onInstalled.addListener(() => void poll());

let busy = false;
async function poll() {
  if (busy) return;
  busy = true;
  try {
    const r = await fetch(`${APP}/jobs`, { headers: HEADERS }).catch(() => null);
    if (!r?.ok) return;
    const { jobs = [], version } = await r.json();
    // IcpFinder updated the extension files: reload so the new version runs, no clicks needed.
    if (version && version !== chrome.runtime.getManifest().version) {
      chrome.runtime.reload();
      return;
    }
    for (const job of jobs) {
      const text = SITES.test(job.url) ? await read(job.url) : "ERROR not an allowed site";
      await fetch(`${APP}/results`, {
        method: "POST",
        headers: { ...HEADERS, "content-type": "application/json" },
        body: JSON.stringify({ id: job.id, url: job.url, text }),
      }).catch(() => null);
    }
  } finally {
    busy = false;
  }
}

/** Load a page in a minimized window, wait, copy its visible text, close it. */
async function read(url) {
  const win = await chrome.windows.create({ url, focused: false, state: "minimized" });
  const tabId = win.tabs?.[0]?.id;
  try {
    await waitLoaded(tabId, 25_000);
    await sleep(3500);
    const [res] = await chrome.scripting.executeScript({
      target: { tabId },
      // Only the posts, not the menus: scroll a little so more load, then copy each post's text
      // and its own link. Falls back to the page text when a site changes its layout.
      func: async () => {
        for (let i = 0; i < 3; i++) {
          window.scrollBy(0, window.innerHeight * 2);
          await new Promise((r) => setTimeout(r, 1200));
        }
        const nodes = document.querySelectorAll(
          'article, shreddit-post, [data-testid="post-container"], .feed-shared-update-v2, div[data-urn*="activity"]'
        );
        const posts = [];
        for (const n of nodes) {
          const text = (n.innerText || "").replace(/\n{2,}/g, "\n").trim();
          if (text.length < 40) continue;
          const a = n.querySelector('a[href*="/status/"], a[href*="/comments/"], a[href*="/feed/update/"], a[href*="/posts/"]');
          const urn = n.getAttribute("data-urn") || n.closest("[data-urn]")?.getAttribute("data-urn");
          const link = a?.href || (urn ? `https://www.linkedin.com/feed/update/${urn}/` : "");
          posts.push(`POST${link ? ` ${link}` : ""}\n${text.slice(0, 900)}`);
        }
        const unique = [...new Set(posts)];
        const text = unique.length ? unique.join("\n\n") : document.body ? document.body.innerText : "";
        return text.slice(0, 9000);
      },
    });
    return res?.result || "";
  } catch (e) {
    return `ERROR ${e?.message || e}`;
  } finally {
    await chrome.windows.remove(win.id).catch(() => {});
    // Human pace between pages.
    await sleep(2000 + Math.random() * 2000);
  }
}

function waitLoaded(tabId, ms) {
  return new Promise((resolve) => {
    const done = () => {
      chrome.tabs.onUpdated.removeListener(on);
      clearTimeout(t);
      resolve();
    };
    const on = (id, info) => {
      if (id === tabId && info.status === "complete") done();
    };
    const t = setTimeout(done, ms);
    chrome.tabs.onUpdated.addListener(on);
  });
}
