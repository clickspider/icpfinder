// SPDX-License-Identifier: MIT
//
// RunRecorder — abstracts persistence so the streaming route can run
// with or without a database. Production wants Postgres; demo and
// preview deploys without DATABASE_URL fall back to a no-op recorder
// (the SSE stream still works, just nothing gets logged).

import type { FindEvent } from "@icpfinder/core";
import type { PrismaClient } from "@prisma/client";

export type RunStatus = "running" | "done" | "error" | "cancelled" | "budget_exceeded";

export interface RecordedRun {
  /** Stable ID used in the leading SSE frame and for later lookups. */
  id: string;
}

export interface RunRecorder {
  /** Create a Run row (or fabricate an ID if no DB). */
  startRun(seed: string, clientIpHash: string): Promise<RecordedRun>;
  /** Persist one streamed event. Errors are swallowed by the route. */
  recordEvent(runId: string, event: FindEvent): Promise<void>;
  /** Finalize the Run row with status + totals. */
  finishRun(runId: string, status: RunStatus, totalCostCents: number): Promise<void>;
}

export class PrismaRunRecorder implements RunRecorder {
  constructor(private readonly prisma: PrismaClient) {}

  async startRun(seed: string, clientIpHash: string): Promise<RecordedRun> {
    const row = await this.prisma.run.create({
      data: { seed, clientIpHash, status: "running" },
    });
    return { id: row.id };
  }

  async recordEvent(runId: string, event: FindEvent): Promise<void> {
    await this.prisma.event.create({
      data: { runId, type: event.type, payload: JSON.stringify(event) },
    });
  }

  async finishRun(runId: string, status: RunStatus, totalCostCents: number): Promise<void> {
    await this.prisma.run.update({
      where: { id: runId },
      data: { status, totalCostCents, finishedAt: new Date() },
    });
  }
}

const randomId = (): string =>
  `mem_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

/** Used when DATABASE_URL is unset. Generates an in-process ID and
 * drops every event on the floor. The route still streams correctly. */
export class NoopRunRecorder implements RunRecorder {
  async startRun(_seed: string, _clientIpHash: string): Promise<RecordedRun> {
    return { id: randomId() };
  }
  async recordEvent(_runId: string, _event: FindEvent): Promise<void> {}
  async finishRun(_runId: string, _status: RunStatus, _totalCostCents: number): Promise<void> {}
}
