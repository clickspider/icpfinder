// SPDX-License-Identifier: MIT
//
// Live browser agent: an in-app browser panel (WebContentsView) that Claude
// drives through the icpfinder-browser MCP server. The founder watches it live,
// sees short steps next to it, and approves anything that would be sent.

import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseCliResult } from "@icpfinder/providers";
import { type BrowserWindow, WebContentsView } from "electron";
import type { AgentRun, AgentStep } from "../shared/types";
import { runBrowserLoop } from "./browser-loop";
import { subscriptionEnv } from "./cli";
import { createLlm, getModel, getProvider } from "./engine";
import { recordUsage } from "./usage";

const SYSTEM = `You work for a startup founder inside IcpFinder. You control a browser panel the founder watches live, using the icpfinder-browser tools.
Rules:
- Keep each step small: open, read, then act. Use browser_read to get element ids before clicking or typing.
- NEVER send, post, submit, connect, follow or message anyone without calling ask_founder first and getting "approved". Show the exact text in the preview.
- If a login is needed, say so in one sentence and stop; the founder logs in inside the panel.
- Be brief. When done, end with one sentence on what you did.`;

/** Page script: number the interactive elements and return a compact view of the page. */
const READ_JS = `(() => {
  let n = 0; const els = [];
  document.querySelectorAll('a,button,input,textarea,select,[role=button],[contenteditable=true]').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > innerHeight * 2) return;
    el.setAttribute('data-icp-id', String(++n));
    const label = (el.getAttribute('aria-label') || el.innerText || el.value || el.placeholder || el.title || '').trim().replace(/\\s+/g, ' ').slice(0, 80);
    els.push(n + ': ' + el.tagName.toLowerCase() + (el.type ? '[' + el.type + ']' : '') + ' ' + label);
  });
  const text = document.body.innerText.replace(/\\n{3,}/g, '\\n\\n').slice(0, 6000);
  return { title: document.title, url: location.href, text, elements: els.slice(0, 150).join('\\n') };
})()`;

const HIDDEN_OK = { stayHidden: true, stayAwake: true };

export class BrowserAgent {
  readonly view: WebContentsView;
  private server: Server | null = null;
  private port = 0;
  private token = "";
  private run: AgentRun | null = null;
  private approve: ((v: string) => void) | null = null;
  private child: ReturnType<typeof spawn> | null = null;
  private controller: AbortController | null = null;

  constructor(
    win: BrowserWindow,
    private readonly onChange: (r: AgentRun | null) => void,
    private readonly claudeBin: () => Promise<string>
  ) {
    this.view = new WebContentsView({
      // No background throttling: the agent keeps working while the founder is on another screen.
      webPreferences: {
        partition: "persist:icpfinder-agent",
        sandbox: true,
        backgroundThrottling: false,
      },
    });
    this.view.setVisible(false);
    void this.view.webContents.loadURL("about:blank");
    win.contentView.addChildView(this.view);
    this.view.webContents.on("did-navigate", () => this.touch());
  }

  setBounds(b: { x: number; y: number; width: number; height: number } | null): void {
    if (!b) {
      this.view.setVisible(false);
      return;
    }
    this.view.setBounds({
      x: Math.round(b.x),
      y: Math.round(b.y),
      width: Math.round(b.width),
      height: Math.round(b.height),
    });
    this.view.setVisible(true);
  }

  /** Small live picture for the mini window, taken even while the panel is hidden. */
  async thumb(): Promise<string | null> {
    if (!this.run) return null;
    const img = await this.view.webContents.capturePage(undefined, HIDDEN_OK).catch(() => null);
    return img && !img.isEmpty() ? img.resize({ width: 480 }).toDataURL() : null;
  }

  current(): AgentRun | null {
    return this.run;
  }

  private touch(): void {
    if (this.run) this.run.url = this.view.webContents.getURL();
    this.onChange(this.run ? { ...this.run, steps: [...this.run.steps] } : null);
  }

  private step(kind: AgentStep["kind"], text: string): void {
    this.run?.steps.push({ at: new Date().toISOString(), kind, text });
    this.touch();
  }

  answer(ok: boolean, reason = ""): void {
    if (!this.approve || !this.run) return;
    this.run.status = "running";
    this.run.ask = undefined;
    this.step("ask", ok ? "You approved" : `You declined${reason ? `: ${reason}` : ""}`);
    this.approve(ok ? "approved" : `declined: ${reason || "no reason given"}`);
    this.approve = null;
  }

  stop(): void {
    this.controller?.abort();
    this.child?.kill("SIGTERM");
    if (this.approve) this.answer(false, "stopped");
    if (this.run && this.run.status !== "done") this.run.status = "stopped";
    this.touch();
  }

  private async tool(name: string, args: Record<string, unknown>): Promise<unknown> {
    const wc = this.view.webContents;
    const text = (t: string) => ({ content: [{ type: "text", text: t }] });
    switch (name) {
      case "browser_open": {
        const url = String(args.url ?? "");
        if (!/^https:\/\//.test(url)) return text("Only https URLs are allowed.");
        this.step("open", `Opened ${new URL(url).hostname.replace(/^www\./, "")}`);
        await wc.loadURL(url).catch(() => undefined);
        return text(`Opened ${wc.getURL()}`);
      }
      case "browser_read": {
        this.step("read", `Read ${wc.getTitle() || "the page"}`);
        const r = (await wc.executeJavaScript(READ_JS)) as {
          title: string;
          url: string;
          text: string;
          elements: string;
        };
        return text(
          `TITLE: ${r.title}\nURL: ${r.url}\n\nELEMENTS:\n${r.elements}\n\nTEXT:\n${r.text}`
        );
      }
      case "browser_click": {
        const id = Number(args.id);
        const label = (await wc.executeJavaScript(
          `(() => { const el = document.querySelector('[data-icp-id="${id}"]'); if (!el) return null; el.scrollIntoView({block:'center'}); el.click(); return (el.getAttribute('aria-label') || el.innerText || '').trim().slice(0,60); })()`
        )) as string | null;
        if (label === null) return text(`No element ${id}. Call browser_read again.`);
        this.step("click", `Clicked "${label || `element ${id}`}"`);
        await new Promise((r) => setTimeout(r, 900));
        return text(`Clicked ${id}.`);
      }
      case "browser_type": {
        const id = Number(args.id);
        const value = String(args.text ?? "");
        const ok = (await wc.executeJavaScript(
          `(() => { const el = document.querySelector('[data-icp-id="${id}"]'); if (!el) return false; el.focus(); if (el.isContentEditable) { el.innerText = ${JSON.stringify(value)}; } else { const set = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')?.set; set ? set.call(el, ${JSON.stringify(value)}) : (el.value = ${JSON.stringify(value)}); } el.dispatchEvent(new Event('input', {bubbles:true})); el.dispatchEvent(new Event('change', {bubbles:true})); return true; })()`
        )) as boolean;
        if (!ok) return text(`No element ${id}. Call browser_read again.`);
        this.step("type", `Typed "${value.slice(0, 60)}${value.length > 60 ? "…" : ""}"`);
        return text(`Typed into ${id}.`);
      }
      case "browser_scroll": {
        const up = args.direction === "up";
        await wc.executeJavaScript(
          `window.scrollBy({top: ${up ? "-" : ""}innerHeight * 0.85, behavior: 'smooth'})`
        );
        this.step("scroll", up ? "Scrolled up" : "Scrolled down");
        return text("Scrolled.");
      }
      case "browser_screenshot": {
        this.step("look", "Looked at the page");
        const img = await wc.capturePage(undefined, HIDDEN_OK);
        const png = img.resize({ width: Math.min(1200, img.getSize().width) }).toPNG();
        return {
          content: [{ type: "image", data: png.toString("base64"), mimeType: "image/png" }],
        };
      }
      case "ask_founder": {
        if (!this.run) return text("declined: no run");
        this.run.status = "waiting";
        this.run.ask = {
          action: String(args.action ?? ""),
          preview: args.preview ? String(args.preview) : undefined,
        };
        this.step("ask", `Waiting for your OK: ${this.run.ask.action}`);
        const verdict = await new Promise<string>((resolve) => {
          this.approve = resolve;
        });
        return text(verdict);
      }
      default:
        return text(`Unknown tool ${name}`);
    }
  }

  private async ensureBridge(): Promise<void> {
    if (this.server) return;
    this.token = randomBytes(24).toString("hex");
    this.server = createServer((req, res) => {
      if (
        req.method !== "POST" ||
        req.url !== "/call" ||
        req.headers["x-icp-token"] !== this.token
      ) {
        res.writeHead(403).end();
        return;
      }
      let body = "";
      req.on("data", (d) => {
        body += d;
      });
      req.on("end", () => {
        void (async () => {
          try {
            const { name, args } = JSON.parse(body) as {
              name: string;
              args: Record<string, unknown>;
            };
            const out = await this.tool(name, args ?? {});
            res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(out));
          } catch (e) {
            res.writeHead(500).end(e instanceof Error ? e.message : String(e));
          }
        })();
      });
    });
    await new Promise<void>((resolve) => this.server?.listen(0, "127.0.0.1", resolve));
    const addr = this.server.address();
    this.port = typeof addr === "object" && addr ? addr.port : 0;
  }

  /** Start Claude on a task. Steps stream into the run; the founder watches the panel. */
  /** Continue the current session: Claude gets the original goal, what happened so far and the founder's answer. */
  async reply(text: string): Promise<AgentRun | null> {
    const prev = this.run;
    if (!prev) return this.start(text);
    const goal = prev.goal ?? prev.task;
    const story = prev.steps
      .filter((s) => s.kind !== "read" && s.kind !== "scroll")
      .slice(-14)
      .map((s) => `- ${s.kind}: ${s.text}`)
      .join("\n");
    const prompt = `ORIGINAL TASK (still the goal): ${goal}\n\nWHAT HAPPENED SO FAR:\n${story || "- nothing yet"}\nThe browser is on: ${this.view.webContents.getURL() || "a blank page"}\n\nTHE FOUNDER NOW SAYS: ${text}\n\nContinue the original task with this answer. Do not start over unless the founder asks.`;
    return this.start(prompt, undefined, { goal, keepSteps: prev.steps, shown: text });
  }

  async start(
    task: string,
    startUrl?: string,
    cont?: { goal: string; keepSteps: AgentStep[]; shown: string }
  ): Promise<AgentRun> {
    if (this.run?.status === "running" || this.run?.status === "waiting") this.stop();
    const controller = new AbortController();
    this.controller = controller;
    await this.ensureBridge();
    this.run = {
      id: `run_${Date.now().toString(36)}`,
      task: cont ? cont.goal : task,
      goal: cont ? cont.goal : task,
      status: "running",
      steps: cont
        ? [
            ...cont.keepSteps,
            { at: new Date().toISOString(), kind: "say", text: `You: ${cont.shown}` },
          ]
        : [],
    };
    if (startUrl) await this.view.webContents.loadURL(startUrl).catch(() => undefined);
    const activeRun = this.run;
    if (getProvider() !== "claude") {
      void (async () => {
        try {
          const llm = await createLlm(false, controller.signal);
          await runBrowserLoop({
            llm,
            task,
            system: SYSTEM,
            signal: controller.signal,
            tool: (name, args) => this.tool(name, args),
            say: (text) => this.step("say", text),
          });
          if (this.run === activeRun && !controller.signal.aborted) {
            activeRun.status = "done";
            this.step("done", "Done");
          }
        } catch (error) {
          if (this.run === activeRun && !controller.signal.aborted) {
            activeRun.status = "failed";
            this.step("error", error instanceof Error ? error.message : "Browser request failed.");
          }
        }
      })();
      this.touch();
      return activeRun;
    }
    try {
      await createLlm(false, controller.signal);
    } catch (error) {
      if (this.run === activeRun && !controller.signal.aborted) {
        activeRun.status = "failed";
        this.step("error", error instanceof Error ? error.message : "Check your AI subscription.");
      }
      return activeRun;
    }
    if (controller.signal.aborted) return activeRun;
    const cfg = join(tmpdir(), `icpfinder-mcp-${process.pid}.json`);
    writeFileSync(
      cfg,
      JSON.stringify({
        mcpServers: {
          "icpfinder-browser": {
            command: process.execPath,
            // In the packaged app the helper is unpacked next to the archive so plain Node can run it.
            args: [join(__dirname, "mcpBrowser.js").replace("app.asar", "app.asar.unpacked")],
            env: {
              ELECTRON_RUN_AS_NODE: "1",
              ICP_BRIDGE_PORT: String(this.port),
              ICP_BRIDGE_TOKEN: this.token,
            },
          },
        },
      }),
      { mode: 0o600 }
    );
    let bin: string;
    try {
      bin = await this.claudeBin();
    } catch {
      if (this.run === activeRun && !controller.signal.aborted) {
        activeRun.status = "failed";
        this.step("error", "Could not find Claude Code. Check AI subscriptions.");
      }
      return activeRun;
    }
    if (controller.signal.aborted) return activeRun;
    const env = subscriptionEnv();
    const child = spawn(
      bin,
      [
        "-p",
        "--output-format",
        "stream-json",
        "--verbose",
        "--mcp-config",
        cfg,
        "--strict-mcp-config",
        "--tools",
        "",
        "--allowedTools",
        "mcp__icpfinder-browser",
        "--setting-sources",
        "",
        "--no-session-persistence",
        "--model",
        getModel() || "sonnet",
        "--append-system-prompt",
        SYSTEM,
      ],
      { env, stdio: ["pipe", "pipe", "pipe"] }
    );
    this.child = child;
    child.stdin.on("error", () => {
      if (this.run === activeRun && !controller.signal.aborted) {
        activeRun.status = "failed";
        this.step("error", "Claude closed the request.");
      }
    });
    child.on("error", () => {
      if (this.run === activeRun) {
        activeRun.status = "failed";
        this.step("error", "Could not start Claude. Check AI subscriptions.");
      }
    });
    let buf = "";
    child.stdout?.on("data", (d: Buffer) => {
      if (this.run !== activeRun || controller.signal.aborted) return;
      buf += d.toString();
      let nl = buf.indexOf("\n");
      while (nl >= 0) {
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        nl = buf.indexOf("\n");
        try {
          const ev = JSON.parse(line) as {
            type?: string;
            message?: { content?: Array<{ type: string; text?: string }> };
            result?: string;
          };
          if (ev.type === "result") {
            const u = parseCliResult(line).usage;
            if (u) recordUsage("claude", u);
          }
          if (ev.type === "assistant") {
            for (const part of ev.message?.content ?? []) {
              if (part.type === "text" && part.text?.trim())
                this.step("say", part.text.trim().slice(0, 400));
            }
          }
        } catch {
          // Not JSON; ignore.
        }
      }
    });
    let err = "";
    child.stderr?.on("data", (d: Buffer) => {
      err += d.toString();
    });
    child.on("close", (code) => {
      if (this.run !== activeRun || controller.signal.aborted) return;
      if (this.run.status === "running" || this.run.status === "waiting") {
        this.run.status = code === 0 ? "done" : "failed";
        if (code !== 0) this.step("error", err.trim().slice(0, 300) || `Claude stopped (${code})`);
        else this.step("done", "Done");
      }
      this.child = null;
    });
    child.stdin?.end(task);
    this.touch();
    return this.run;
  }
}
