// SPDX-License-Identifier: MIT

import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { POST } from "../app/mcp/route";
import { FIND_ICP_TOOL, handleMcpMessage, type ToolResult } from "../lib/mcp";

const ok: ToolResult = { content: [{ type: "text", text: "ok" }] };
const run = async () => ok;

const rpc = (body: unknown) =>
  new NextRequest("http://localhost/mcp", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
    body: JSON.stringify(body),
  });

describe("handleMcpMessage", () => {
  it("negotiates a supported protocol version", async () => {
    const res = (await handleMcpMessage(
      { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26" } },
      run
    )) as { result: { protocolVersion: string; capabilities: object } };
    expect(res.result.protocolVersion).toBe("2025-03-26");
    expect(res.result.capabilities).toHaveProperty("tools");
  });

  it("lists find_icp", async () => {
    const res = (await handleMcpMessage({ jsonrpc: "2.0", id: 2, method: "tools/list" }, run)) as {
      result: { tools: { name: string }[] };
    };
    expect(res.result.tools.map((t) => t.name)).toEqual([FIND_ICP_TOOL.name]);
  });

  it("returns no reply for a notification", async () => {
    expect(
      await handleMcpMessage({ jsonrpc: "2.0", method: "notifications/initialized" }, run)
    ).toBeNull();
  });

  it("rejects an empty product as a tool error, not a protocol error", async () => {
    const res = (await handleMcpMessage(
      { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "find_icp", arguments: {} } },
      run
    )) as { result: ToolResult };
    expect(res.result.isError).toBe(true);
  });

  it("answers unknown methods with -32601", async () => {
    const res = (await handleMcpMessage({ jsonrpc: "2.0", id: 4, method: "nope" }, run)) as {
      error: { code: number };
    };
    expect(res.error.code).toBe(-32601);
  });
});

describe("POST /mcp", () => {
  it("returns 202 for a notification", async () => {
    const res = await POST(rpc({ jsonrpc: "2.0", method: "notifications/initialized" }));
    expect(res.status).toBe(202);
  });

  it("runs find_icp end to end on the stub providers", async () => {
    const res = await POST(
      rpc({
        jsonrpc: "2.0",
        id: 5,
        method: "tools/call",
        params: { name: "find_icp", arguments: { product: "A CRM for solo plumbers" } },
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { result: ToolResult };
    expect(body.result.isError).toBeUndefined();
    expect(body.result.content[0]?.text).toContain("icpfinder.dev/find");
    expect(body.result.structuredContent?.archetypes).toBeInstanceOf(Array);
  });
});
