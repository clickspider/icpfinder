// SPDX-License-Identifier: MIT
//
// Tiny MCP server (stdio, newline-delimited JSON-RPC) that Claude Code starts.
// It exposes the IcpFinder in-app browser as tools and forwards each call to
// the app over a local HTTP bridge (127.0.0.1 + a one-run token).
// Runs as plain Node: Electron starts it with ELECTRON_RUN_AS_NODE=1.

import { createInterface } from "node:readline";

const PORT = process.env.ICP_BRIDGE_PORT;
const TOKEN = process.env.ICP_BRIDGE_TOKEN ?? "";

export const TOOLS = [
  {
    name: "browser_open",
    description: "Open a URL in the founder's IcpFinder browser panel (the founder watches live).",
    inputSchema: { type: "object", properties: { url: { type: "string" } }, required: ["url"] },
  },
  {
    name: "browser_read",
    description:
      "Read the current page: title, URL, visible text, and the clickable/typeable elements with ids to use in browser_click and browser_type.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "browser_click",
    description: "Click an element by its id from browser_read.",
    inputSchema: { type: "object", properties: { id: { type: "number" } }, required: ["id"] },
  },
  {
    name: "browser_type",
    description:
      "Type text into an input or textarea by its id from browser_read. Does not submit.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "number" }, text: { type: "string" } },
      required: ["id", "text"],
    },
  },
  {
    name: "browser_scroll",
    description: "Scroll the page down or up by one screen.",
    inputSchema: {
      type: "object",
      properties: { direction: { type: "string", enum: ["down", "up"] } },
      required: ["direction"],
    },
  },
  {
    name: "browser_screenshot",
    description: "See the current page as an image.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "ask_founder",
    description:
      "REQUIRED before anything is sent, posted, submitted or requested on the founder's behalf. Shows the founder what you are about to do and waits for OK. Returns 'approved' or 'declined: <reason>'.",
    inputSchema: {
      type: "object",
      properties: { action: { type: "string" }, preview: { type: "string" } },
      required: ["action"],
    },
  },
];

type Rpc = {
  jsonrpc: "2.0";
  id?: number | string;
  method: string;
  params?: Record<string, unknown>;
};

const send = (msg: unknown) => process.stdout.write(`${JSON.stringify(msg)}\n`);

const callBridge = async (name: string, args: unknown): Promise<unknown> => {
  const res = await fetch(`http://127.0.0.1:${PORT}/call`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-icp-token": TOKEN },
    body: JSON.stringify({ name, args }),
  });
  if (!res.ok) throw new Error(`bridge ${res.status}: ${await res.text()}`);
  return res.json();
};

const handle = async (m: Rpc): Promise<void> => {
  if (m.id === undefined) return; // notifications
  try {
    if (m.method === "initialize") {
      send({
        jsonrpc: "2.0",
        id: m.id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "icpfinder-browser", version: "0.1.0" },
        },
      });
    } else if (m.method === "tools/list") {
      send({ jsonrpc: "2.0", id: m.id, result: { tools: TOOLS } });
    } else if (m.method === "tools/call") {
      const p = m.params as { name: string; arguments?: unknown };
      const result = await callBridge(p.name, p.arguments ?? {});
      send({ jsonrpc: "2.0", id: m.id, result });
    } else {
      send({
        jsonrpc: "2.0",
        id: m.id,
        error: { code: -32601, message: `Unknown method ${m.method}` },
      });
    }
  } catch (e) {
    send({
      jsonrpc: "2.0",
      id: m.id,
      result: {
        content: [{ type: "text", text: `Error: ${e instanceof Error ? e.message : String(e)}` }],
        isError: true,
      },
    });
  }
};

if (PORT) {
  createInterface({ input: process.stdin }).on("line", (line) => {
    if (!line.trim()) return;
    try {
      void handle(JSON.parse(line) as Rpc);
    } catch {
      // Ignore malformed lines.
    }
  });
}
