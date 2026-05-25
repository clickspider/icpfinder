// SPDX-License-Identifier: MIT
//
// Glue between IcpFinder.find() and the SSE route. Responsibilities:
//   - create a Run row at start, update status/finishedAt at end
//   - persist every FindEvent to Event table for later replay/debug
//   - record cost into the rate limiter
//   - re-yield the same events upstream so the route can stream them

import type { FindEvent, FindInput, IcpFinder } from "@icpfinder/core";
import type { PrismaClient } from "@prisma/client";
import type { RateLimiter } from "./rate-limit";

export interface RunStreamDeps {
  finder: IcpFinder;
  prisma: PrismaClient;
  rateLimiter: RateLimiter;
  clientIpHash: string;
  /** Already-validated FindInput. */
  input: FindInput;
}

/**
 * Persist + bookkeeping pipeline. Yields FindEvent values for the SSE
 * encoder. Always closes the Run row even on cancellation.
 */
export async function* streamRun(deps: RunStreamDeps): AsyncGenerator<FindEvent, void, void> {
  const run = await deps.prisma.run.create({
    data: {
      seed: deps.input.seed,
      clientIpHash: deps.clientIpHash,
      status: "running",
    },
  });
  // Send the runId as the very first frame so the client can deep-link.
  yield {
    type: "cost",
    cost: { units: 0, costCents: 0, provider: "system", endpoint: `run:${run.id}` },
  };

  let totalCostCents = 0;
  let finalStatus: "done" | "error" | "cancelled" | "budget_exceeded" = "done";

  try {
    for await (const event of deps.finder.find(deps.input)) {
      await deps.prisma.event.create({
        data: { runId: run.id, type: event.type, payload: JSON.stringify(event) },
      });

      if (event.type === "cost") {
        totalCostCents += event.cost.costCents;
        await deps.rateLimiter.recordCost(deps.clientIpHash, event.cost.costCents);
      }
      if (event.type === "error" && !event.recoverable) {
        finalStatus = "error";
      }
      if (event.type === "done") {
        if (deps.input.signal?.aborted) finalStatus = "cancelled";
        else if (
          deps.input.budgetCapCents !== undefined &&
          event.totalCostCents >= deps.input.budgetCapCents
        ) {
          finalStatus = "budget_exceeded";
        }
      }

      yield event;
    }
  } catch (err) {
    finalStatus = "error";
    yield {
      type: "error",
      message: err instanceof Error ? err.message : String(err),
      recoverable: false,
    };
    yield { type: "done", totalCostCents };
  } finally {
    await deps.prisma.run.update({
      where: { id: run.id },
      data: {
        status: finalStatus,
        totalCostCents,
        finishedAt: new Date(),
      },
    });
  }
}
