// SPDX-License-Identifier: MIT

import type { FindEvent } from "@icpfinder/core";
import { describe, expect, it, vi } from "vitest";
import { NoopRunRecorder, PrismaRunRecorder } from "../lib/run-recorder";

describe("NoopRunRecorder", () => {
  it("returns a stable, non-empty run id", async () => {
    const recorder = new NoopRunRecorder();
    const run = await recorder.startRun("seed", "hash");
    expect(run.id).toMatch(/^mem_/);
  });

  it("recordEvent and finishRun are no-ops that resolve", async () => {
    const recorder = new NoopRunRecorder();
    const event: FindEvent = { type: "done", totalCostCents: 0 };
    await expect(recorder.recordEvent("any", event)).resolves.toBeUndefined();
    await expect(recorder.finishRun("any", "done", 0)).resolves.toBeUndefined();
  });
});

describe("PrismaRunRecorder", () => {
  const makePrismaMock = () => ({
    run: {
      create: vi.fn().mockResolvedValue({ id: "run_xyz" }),
      update: vi.fn().mockResolvedValue({}),
    },
    event: {
      create: vi.fn().mockResolvedValue({}),
    },
  });

  it("startRun creates a Run row with seed + hash + status=running", async () => {
    const prisma = makePrismaMock();
    const recorder = new PrismaRunRecorder(prisma as never);
    const run = await recorder.startRun("my seed", "client-hash");

    expect(run.id).toBe("run_xyz");
    expect(prisma.run.create).toHaveBeenCalledWith({
      data: { seed: "my seed", clientIpHash: "client-hash", status: "running" },
    });
  });

  it("recordEvent serializes the FindEvent as JSON payload", async () => {
    const prisma = makePrismaMock();
    const recorder = new PrismaRunRecorder(prisma as never);
    const event: FindEvent = {
      type: "cost",
      cost: { units: 1, costCents: 0.5, provider: "p", endpoint: "e" },
    };
    await recorder.recordEvent("run_xyz", event);
    const call = prisma.event.create.mock.calls[0]?.[0];
    expect(call.data.runId).toBe("run_xyz");
    expect(call.data.type).toBe("cost");
    expect(JSON.parse(call.data.payload)).toEqual(event);
  });

  it("finishRun updates status + totalCostCents + finishedAt", async () => {
    const prisma = makePrismaMock();
    const recorder = new PrismaRunRecorder(prisma as never);
    await recorder.finishRun("run_xyz", "budget_exceeded", 123.45);
    const call = prisma.run.update.mock.calls[0]?.[0];
    expect(call.where).toEqual({ id: "run_xyz" });
    expect(call.data.status).toBe("budget_exceeded");
    expect(call.data.totalCostCents).toBe(123.45);
    expect(call.data.finishedAt).toBeInstanceOf(Date);
  });
});
