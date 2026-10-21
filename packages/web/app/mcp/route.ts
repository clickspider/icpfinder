// SPDX-License-Identifier: MIT
//
// /mcp — MCP server over Streamable HTTP (stateless, JSON responses).
// Protocol logic lives in lib/mcp.ts; this route wires find_icp to the same
// limits and providers as /api/archetypes.

import { generateArchetypes } from "@icpfinder/core";
import { type NextRequest, NextResponse } from "next/server";
import { buildApiContext, debitOperatorCost } from "../../lib/api-context";
import {
  archetypesText,
  type FindIcpRunner,
  handleMcpMessage,
  type JsonRpcMessage,
  toolError,
} from "../../lib/mcp";
import { resolveSeed } from "../../lib/resolve-seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function runnerFor(request: NextRequest): FindIcpRunner {
  return async (product) => {
    const ctxResult = await buildApiContext(
      request,
      {
        seed: product,
        geminiApiKey: request.headers.get("x-gemini-api-key") ?? undefined,
      },
      { enforceRateLimit: true, enforceMonthlyBudget: true }
    );
    if (!ctxResult.ok) {
      const body = (await ctxResult.response.json().catch(() => ({}))) as { error?: string };
      return toolError(
        `${body.error ?? "icpfinder could not start this run."} Set the X-Gemini-Api-Key header for unlimited runs, or use https://icpfinder.dev/find.`
      );
    }
    const { ctx } = ctxResult;
    try {
      const result = await generateArchetypes({
        llm: ctx.bundle.llm,
        seed: await resolveSeed(ctx.seed),
        limit: 3,
        grounding: false,
      });
      debitOperatorCost(ctx, ctx.bundle, ctx.bundle.llm.name, result.costCents);
      if (result.archetypes.length === 0)
        return toolError("No archetypes came back. Try a more specific product description.");
      return {
        content: [{ type: "text", text: archetypesText(result.archetypes) }],
        structuredContent: {
          archetypes: result.archetypes,
          contactsUrl: "https://icpfinder.dev/find",
        },
      };
    } catch (err) {
      return toolError(
        `Archetype generation failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  };
}

export async function POST(request: NextRequest): Promise<Response> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } },
      { status: 400 }
    );
  }
  const run = runnerFor(request);
  const messages = (Array.isArray(payload) ? payload : [payload]) as JsonRpcMessage[];
  const replies = (await Promise.all(messages.map((m) => handleMcpMessage(m ?? {}, run)))).filter(
    (r): r is object => r !== null
  );
  // Only notifications or responses: acknowledge with 202 and no body.
  if (replies.length === 0) return new Response(null, { status: 202 });
  return NextResponse.json(Array.isArray(payload) ? replies : replies[0]);
}

// Stateless server: no server-to-client stream and no sessions to end.
export function GET(): Response {
  return new Response("This MCP server does not offer an SSE stream. POST JSON-RPC to /mcp.", {
    status: 405,
    headers: { Allow: "POST" },
  });
}

export const DELETE = GET;
