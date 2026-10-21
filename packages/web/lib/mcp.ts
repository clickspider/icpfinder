// SPDX-License-Identifier: MIT
//
// Minimal MCP server (Streamable HTTP, stateless, JSON responses) so AI
// agents can run icpfinder from chat (AgentReady AR-ACT-03 / AR-ACT-10).
// One tool: find_icp. It uses the same per-IP daily limit, monthly budget
// and own-key rules as the website. Contacts stay on the website, because
// each Hunter search costs real money.

import type { Archetype } from "@icpfinder/core";
import { SITE_URL } from "./site";

export const MCP_PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"] as const;
export const SERVER_INFO = { name: "icpfinder", title: "icpfinder", version: "0.1.0" };

export const SERVER_INSTRUCTIONS =
  "icpfinder finds who will pay for a product idea. Call find_icp with a short product description or the product's URL. " +
  "It returns 3 ideal customer profile (ICP) archetypes with role, pain, selling angle, objections and example companies. " +
  `Verified contact emails are on ${SITE_URL}/find. Free demo runs have a daily limit; ` +
  "for unlimited runs, set the X-Gemini-Api-Key header in your MCP client config.";

export const FIND_ICP_TOOL = {
  name: "find_icp",
  title: "Find ideal customer profiles",
  description:
    "Given a product idea or product URL, return 3 ideal customer profile (ICP) archetypes: industry, buyer role, company size, pain, selling angle, buying signals, likely objections and real example companies. Use it when someone asks who their customer is, who to sell to first, or how to find their ICP.",
  inputSchema: {
    type: "object",
    properties: {
      product: {
        type: "string",
        description:
          "What the product does and for whom, in one or two sentences, or the product's website URL.",
        maxLength: 2000,
      },
    },
    required: ["product"],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true, openWorldHint: true },
} as const;

export interface JsonRpcMessage {
  jsonrpc?: unknown;
  id?: string | number | null;
  method?: unknown;
  params?: Record<string, unknown>;
}

export type ToolResult = {
  content: { type: "text"; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

/** Runs find_icp for one product seed. Injected so tests need no network. */
export type FindIcpRunner = (product: string) => Promise<ToolResult>;

const rpcResult = (id: JsonRpcMessage["id"], result: unknown) => ({
  jsonrpc: "2.0",
  id: id ?? null,
  result,
});

const rpcError = (id: JsonRpcMessage["id"], code: number, message: string) => ({
  jsonrpc: "2.0",
  id: id ?? null,
  error: { code, message },
});

export function toolError(text: string): ToolResult {
  return { content: [{ type: "text", text }], isError: true };
}

/** Plain-text rendering of the archetypes, for hosts that ignore structuredContent. */
export function archetypesText(archetypes: Archetype[]): string {
  const blocks = archetypes.map((a, i) => {
    const lines = [`${i + 1}. ${a.role} at ${a.industry} (${a.companySize})`, `Pain: ${a.pain}`];
    if (a.sellingAngle) lines.push(`Selling angle: ${a.sellingAngle}`);
    if (a.buyingSignals.length) lines.push(`Buying signals: ${a.buyingSignals.join("; ")}`);
    if (a.objections?.length) lines.push(`Objections: ${a.objections.join("; ")}`);
    if (a.exampleCompanies.length)
      lines.push(
        `Example companies: ${a.exampleCompanies.map((c) => `${c.name} (${c.domain})`).join(", ")}`
      );
    return lines.join("\n");
  });
  return `${blocks.join("\n\n")}\n\nVerified contact emails for these archetypes: ${SITE_URL}/find`;
}

/**
 * Handle one JSON-RPC message. Returns null for notifications (no reply).
 */
export async function handleMcpMessage(
  msg: JsonRpcMessage,
  runFindIcp: FindIcpRunner
): Promise<object | null> {
  const isRequest = msg.id !== undefined && msg.id !== null;
  if (msg.jsonrpc !== "2.0" || typeof msg.method !== "string") {
    return rpcError(msg.id, -32600, "Invalid request");
  }
  if (!isRequest) return null;

  switch (msg.method) {
    case "initialize": {
      const asked = msg.params?.protocolVersion;
      const protocolVersion =
        MCP_PROTOCOL_VERSIONS.find((v) => v === asked) ?? MCP_PROTOCOL_VERSIONS[0];
      return rpcResult(msg.id, {
        protocolVersion,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: SERVER_INSTRUCTIONS,
      });
    }
    case "ping":
      return rpcResult(msg.id, {});
    case "tools/list":
      return rpcResult(msg.id, { tools: [FIND_ICP_TOOL] });
    case "tools/call": {
      const name = msg.params?.name;
      if (name !== FIND_ICP_TOOL.name)
        return rpcError(msg.id, -32602, `Unknown tool: ${String(name)}`);
      const args = (msg.params?.arguments ?? {}) as Record<string, unknown>;
      const product = typeof args.product === "string" ? args.product.trim() : "";
      if (!product) return rpcResult(msg.id, toolError("product is required"));
      if (product.length > 2000)
        return rpcResult(msg.id, toolError("product is longer than 2000 characters"));
      return rpcResult(msg.id, await runFindIcp(product));
    }
    default:
      return rpcError(msg.id, -32601, `Method not found: ${msg.method}`);
  }
}
