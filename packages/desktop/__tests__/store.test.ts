// SPDX-License-Identifier: MIT

import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { activeWorkspace, emptyState, loadState, saveState, updateActive } from "../src/main/store";

const tmp = () => join(mkdtempSync(join(tmpdir(), "icpfinder-")), "state.json");

describe("store", () => {
  it("returns an empty state for a missing or broken file", () => {
    const f = tmp();
    expect(loadState(f)).toEqual(emptyState());
    writeFileSync(f, "{not json");
    expect(loadState(f)).toEqual(emptyState());
  });

  it("round-trips and fills new settings with defaults", () => {
    const f = tmp();
    const s = emptyState();
    s.workspaces.push({
      id: "ws1",
      product: {
        url: "https://a.dev",
        name: "A",
        sell: "",
        problem: "",
        different: "",
        price: "",
        siteText: "",
        readAt: "",
      },
      icps: [],
      setupDone: false,
      createdAt: "",
    });
    s.activeId = "ws1";
    saveState(f, s);
    const raw = JSON.parse(readFileSync(f, "utf8"));
    delete raw.settings.dropTime;
    writeFileSync(f, JSON.stringify(raw));
    const back = loadState(f);
    expect(activeWorkspace(back)?.product.name).toBe("A");
    expect(back.settings.dropTime).toBe("06:00");
  });

  it("updateActive throws without an active workspace", () => {
    expect(() => updateActive(emptyState(), () => {})).toThrow("No active workspace");
  });
});
