// SPDX-License-Identifier: MIT

import { spawn } from "node:child_process";
import { once } from "node:events";
import { describe, expect, it } from "vitest";
import { jobs, pauseWorkspace, resumeWorkspace, track } from "../src/main/engine";

describe("pauseWorkspace", () => {
  it("stops running Claude processes of that workspace only, and refuses new ones", async () => {
    const a = jobs.run("ws_a", () => {
      const c = spawn("sleep", ["30"]);
      track(c);
      return c;
    });
    const b = jobs.run("ws_b", () => {
      const c = spawn("sleep", ["30"]);
      track(c);
      return c;
    });
    pauseWorkspace("ws_a");
    await once(a, "close");
    expect(a.killed).toBe(true);
    expect(b.killed).toBe(false);

    const late = jobs.run("ws_a", () => {
      const c = spawn("sleep", ["30"]);
      track(c);
      return c;
    });
    await once(late, "close");
    expect(late.killed).toBe(true);

    resumeWorkspace("ws_a");
    b.kill();
  });
});
