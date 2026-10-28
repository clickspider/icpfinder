// SPDX-License-Identifier: MIT
//
// The link to "IcpFinder for Chrome", the small extension that reads pages in
// the founder's own browser. The app keeps a short list of pages to read on
// 127.0.0.1:47321; the extension asks for it every 30 seconds, reads each page
// in a minimized window and posts the text back. Only our extension may talk
// to it: every request must come from its chrome-extension:// origin.

import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

export const BRIDGE_PORT = 47321;
/** Fixed by the "key" in packages/extension/manifest.json, so the ID is the same on every Mac. */
export const EXTENSION_ID = "oengddmgnimipjnfdblmkppmihnlaojp";
const ORIGIN = `chrome-extension://${EXTENSION_ID}`;
/** Same as packages/extension/manifest.json. When they differ, the extension reloads itself. */
export const EXTENSION_VERSION = "0.2.0";

type Job = { id: string; url: string; resolve: (text: string) => void };
const queue: Job[] = [];
const waiting = new Map<string, Job>();
let lastSeen = 0;

/** True when the extension asked for work in the last two minutes. */
export const extensionConnected = (): boolean => Date.now() - lastSeen < 120_000;
export const extensionLastSeen = (): number => lastSeen;

const send = (res: ServerResponse, code: number, body: unknown) => {
  res.writeHead(code, {
    "content-type": "application/json",
    "access-control-allow-origin": ORIGIN,
  });
  res.end(JSON.stringify(body));
};

const readBody = (req: IncomingMessage): Promise<string> =>
  new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => {
      if (data.length < 200_000) data += c;
    });
    req.on("end", () => resolve(data));
  });

export const startExtensionBridge = (): void => {
  const server = createServer(async (req, res) => {
    // Only our own extension. Extension fetches may omit Origin, so it also sends its ID in a
    // custom header; a web page cannot send that header without a CORS preflight, which we refuse.
    const fromExtension =
      req.headers.origin === ORIGIN || req.headers["x-icpfinder-extension"] === EXTENSION_ID;
    if (req.method === "OPTIONS" || !fromExtension) return send(res, 403, { error: "forbidden" });
    lastSeen = Date.now();
    if (req.method === "GET" && req.url === "/jobs") {
      const jobs = queue.splice(0, 6);
      for (const j of jobs) waiting.set(j.id, j);
      return send(res, 200, {
        jobs: jobs.map(({ id, url }) => ({ id, url })),
        version: EXTENSION_VERSION,
      });
    }
    if (req.method === "POST" && req.url === "/results") {
      try {
        const { id, text } = JSON.parse(await readBody(req)) as { id?: string; text?: string };
        const job = id ? waiting.get(id) : undefined;
        if (job) {
          waiting.delete(job.id);
          job.resolve(String(text ?? ""));
        }
        return send(res, 200, { ok: true });
      } catch {
        return send(res, 400, { error: "bad request" });
      }
    }
    return send(res, 404, { error: "not found" });
  });
  // A just-closed IcpFinder can still hold the port for a moment: try again until it is free.
  server.on("error", () => setTimeout(() => server.listen(BRIDGE_PORT, "127.0.0.1"), 5000));
  server.listen(BRIDGE_PORT, "127.0.0.1");
};

/** Read pages in the founder's browser through the extension. Pages that time out come back empty. */
export const readWithExtension = (
  urls: string[],
  timeoutMs = 300_000
): Promise<Array<{ url: string; text: string }>> =>
  Promise.all(
    urls.map(
      (url) =>
        new Promise<{ url: string; text: string }>((resolve) => {
          const job: Job = {
            id: randomUUID(),
            url,
            resolve: (text) => {
              clearTimeout(t);
              resolve({ url, text });
            },
          };
          const t = setTimeout(() => {
            const i = queue.indexOf(job);
            if (i >= 0) queue.splice(i, 1);
            waiting.delete(job.id);
            resolve({ url, text: "" });
          }, timeoutMs);
          queue.push(job);
        })
    )
  );
