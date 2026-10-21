import { EventEmitter } from "node:events";
import type { BrowserWindow } from "electron";
import { beforeEach, describe, expect, it, vi } from "vitest";

const runtime = vi.hoisted(() => ({
  createLlm: vi.fn(),
  getProvider: () => "claude",
  getModel: () => "opus",
}));
const startProcess = vi.hoisted(() => vi.fn());
vi.mock("../src/main/engine", () => runtime);
vi.mock("../src/main/usage", () => ({ recordUsage: vi.fn() }));
vi.mock("node:child_process", () => ({ spawn: startProcess, execFile: vi.fn() }));
vi.mock("node:fs", () => ({ writeFileSync: vi.fn() }));
vi.mock("node:http", () => ({
  createServer: () => ({
    listen: (_port: number, _host: string, callback: () => void) => callback(),
    address: () => ({ port: 12345 }),
  }),
}));
vi.mock("electron", () => ({
  WebContentsView: class {
    setVisible() {}
    webContents = {
      loadURL: async () => {},
      on: () => {},
      getURL: () => "about:blank",
    };
  },
}));

import { BrowserAgent } from "../src/main/agent";

describe("Claude browser subscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runtime.createLlm.mockResolvedValue({});
    startProcess.mockImplementation(() =>
      Object.assign(new EventEmitter(), {
        stdout: new EventEmitter(),
        stderr: new EventEmitter(),
        stdin: Object.assign(new EventEmitter(), { end: vi.fn() }),
        kill: vi.fn(),
      })
    );
  });
  const windowStub = { contentView: { addChildView: () => {} } };

  it("publishes failed state when authentication expires instead of staying busy", async () => {
    runtime.createLlm.mockRejectedValue(new Error("Sign in to Claude first."));
    const changed = vi.fn();
    // Only the contentView interface is needed by this integration fixture.
    const agent = new BrowserAgent(
      windowStub as unknown as BrowserWindow,
      changed,
      async () => "/fixture/claude"
    );
    const run = await agent.start("Read a page");
    expect(run.status).toBe("failed");
    expect(changed).toHaveBeenLastCalledWith(expect.objectContaining({ status: "failed" }));
    expect(startProcess).not.toHaveBeenCalled();
  });

  it("passes the selected model and resolved executable to Claude", async () => {
    const agent = new BrowserAgent(
      windowStub as unknown as BrowserWindow,
      vi.fn(),
      async () => "/fixture/.local/bin/claude"
    );
    await agent.start("Read a page");
    expect(startProcess).toHaveBeenCalledWith(
      "/fixture/.local/bin/claude",
      expect.arrayContaining(["--model", "opus"]),
      expect.objectContaining({
        env: expect.not.objectContaining({ ANTHROPIC_API_KEY: expect.any(String) }),
      })
    );
    agent.stop();
  });
});
