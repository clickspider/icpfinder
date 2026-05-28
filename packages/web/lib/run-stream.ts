// SPDX-License-Identifier: MIT
//
// Glue between IcpFinder.find() and the SSE route. Responsibilities:
//   - create a Run row at start, update status/finishedAt at end
//   - persist every FindEvent to Event table for later replay/debug
//   - record cost into the rate limiter
//   - re-yield the same events upstream so the route can stream them
//
// Persistence is pluggable via RunRecorder; NoopRunRecorder makes the
// whole pipeline DB-optional.

import type { FindEvent, FindInput, IcpFinder } from "@icpfinder/core";
import type { MonthlyBudget } from "./monthly-budget";
import type { BillingSide, ProviderMode } from "./providers";
import type { RateLimiter } from "./rate-limit";
import type { RunRecorder, RunStatus } from "./run-recorder";

export interface RunStreamDeps {
  finder: IcpFinder;
  recorder: RunRecorder;
  rateLimiter: RateLimiter;
  /** Provided when at least one side is operator-paid. */
  monthlyBudget?: MonthlyBudget;
  clientIpHash: string;
  mode: ProviderMode;
  /** Sides the operator is paying for — only cost events from these providers
   * debit per-IP and monthly caps. */
  operatorPaidSides: BillingSide[];
  /** Already-validated FindInput. */
  input: FindInput;
}

export async function* streamRun(deps: RunStreamDeps): AsyncGenerator<FindEvent, void, void> {
  const run = await deps.recorder.startRun(deps.input.seed, deps.clientIpHash);
  // Send the runId as the very first frame so the client can deep-link.
  yield {
    type: "cost",
    cost: { units: 0, costCents: 0, provider: "system", endpoint: `run:${run.id}` },
  };

  let totalCostCents = 0;
  let finalStatus: RunStatus = "done";

  try {
    for await (const event of deps.finder.find(deps.input)) {
      // Recorder errors must never break the stream.
      deps.recorder.recordEvent(run.id, event).catch(() => undefined);

      if (event.type === "cost") {
        totalCostCents += event.cost.costCents;
        // Per-side billing — only debit when this cost came from an
        // operator-paid provider. User-paid sides are free for the operator.
        const provider = event.cost.provider;
        const isOperatorPaid =
          provider === "gemini"
            ? deps.operatorPaidSides.includes("gemini")
            : provider === "hunter"
              ? deps.operatorPaidSides.includes("hunter")
              : false;
        if (isOperatorPaid) {
          deps.rateLimiter
            .recordCost(deps.clientIpHash, event.cost.costCents)
            .catch(() => undefined);
          deps.monthlyBudget?.recordCost(event.cost.costCents).catch(() => undefined);
        }
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
    await deps.recorder.finishRun(run.id, finalStatus, totalCostCents).catch(() => undefined);
  }
}
