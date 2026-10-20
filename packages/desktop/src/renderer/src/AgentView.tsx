// SPDX-License-Identifier: MIT
//
// Live agent: the real browser panel on the left (Claude drives it, you watch),
// and on the right only the steps that matter, plus an OK card before anything
// is sent.

import { useEffect, useRef, useState } from "react";
import type { AgentRun, AgentStep } from "../../shared/types";
import { api, Spinner, ToolLogo } from "./ui";

const STEP_ICON: Record<AgentStep["kind"], string> = {
  open: "M12 3a9 9 0 100 18 9 9 0 000-18z M3 12h18 M12 3c2.5 3 2.5 15 0 18 M12 3c-2.5 3-2.5 15 0 18",
  read: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M12 9a3 3 0 100 6 3 3 0 000-6z",
  click: "M9 3v10l3-3 2 5 2-1-2-5h4z",
  type: "M3 7h18v10H3z M7 11h.01 M11 11h.01 M15 11h.01 M8 14h8",
  scroll: "M12 5v14 M7 14l5 5 5-5",
  look: "M3 7V5a2 2 0 012-2h2 M17 3h2a2 2 0 012 2v2 M21 17v2a2 2 0 01-2 2h-2 M7 21H5a2 2 0 01-2-2v-2 M12 9a3 3 0 100 6 3 3 0 000-6z",
  ask: "M12 3l8 4v5c0 4.5-3.5 8-8 9-4.5-1-8-4.5-8-9V7z M9 12l2 2 4-4",
  say: "M4 5h16v11H8l-4 4z",
  done: "M5 12l5 5 9-10",
  error: "M12 3a9 9 0 100 18 9 9 0 000-18z M12 8v5 M12 16v.01",
};

const Step = ({ s, last }: { s: AgentStep; last: boolean }) => (
  <div className="rise" style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
    <div
      style={{
        width: 26,
        height: 26,
        borderRadius: 8,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          s.kind === "error"
            ? "#fff0f3"
            : s.kind === "done"
              ? "#e6f5ea"
              : last
                ? "#fff0f3"
                : "#f2f2f4",
      }}
    >
      <svg
        aria-hidden="true"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke={
          s.kind === "error"
            ? "#b01a39"
            : s.kind === "done"
              ? "#1f8a43"
              : last
                ? "#e0244a"
                : "#3c3c43"
        }
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={STEP_ICON[s.kind]} />
      </svg>
    </div>
    <div
      style={{
        flex: 1,
        fontSize: 13,
        lineHeight: 1.45,
        paddingTop: 4,
        color: s.kind === "say" ? "var(--ink-2)" : "var(--ink)",
        whiteSpace: "pre-wrap",
      }}
    >
      {s.text}
    </div>
  </div>
);

export const AgentView = ({
  task,
  startUrl,
  title,
  onClose,
}: {
  task?: string;
  startUrl?: string;
  title: string;
  onClose: () => void;
}) => {
  const [run, setRun] = useState<AgentRun | null>(null);
  const [custom, setCustom] = useState("");
  const [reason, setReason] = useState("");
  const panel = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const off = api().onAgent(setRun);
    void api().agentCurrent().then(setRun);
    if (task && !started.current) {
      started.current = true;
      void api().agentStart(task, startUrl).then(setRun);
    }
    return off;
  }, [task, startUrl]);

  // Keep the native browser panel glued to the placeholder.
  useEffect(() => {
    const el = panel.current;
    if (!el) return;
    const sync = () => {
      const r = el.getBoundingClientRect();
      void api().agentBounds({ x: r.left, y: r.top, width: r.width, height: r.height });
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    window.addEventListener("resize", sync);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", sync);
      void api().agentBounds(null);
    };
  }, []);

  // Only the steps that matter: drop "read" and "scroll" noise unless it is the latest.
  const steps = (run?.steps ?? []).filter(
    (s, i, all) => (s.kind !== "read" && s.kind !== "scroll") || i === all.length - 1
  );
  const active = run?.status === "running" || run?.status === "waiting";

  return (
    <div
      className="enter"
      style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}
    >
      <div
        className="drag"
        style={{
          height: 48,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 16px",
          borderBottom: "0.5px solid rgba(0,0,0,0.07)",
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          className="btn"
          style={{ background: "transparent", color: "var(--muted)" }}
          onClick={() => {
            if (active) void api().agentStop();
            onClose();
          }}
        >
          ← Back
        </button>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{title}</div>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: 8,
            alignItems: "center",
            fontSize: 12,
            color: "var(--muted)",
          }}
        >
          {active && (
            <>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  background: "#e0244a",
                  boxShadow: "0 0 0 4px rgba(224,36,74,0.18)",
                }}
              />
              <ToolLogo name="claude" size={16} radius={4} />
              Claude is driving · live
            </>
          )}
          {run?.url && (
            <span
              style={{
                maxWidth: 360,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {run.url}
            </span>
          )}
        </div>
      </div>
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <div
          ref={panel}
          style={{
            flex: 1,
            margin: 10,
            borderRadius: 12,
            background: "#f2f2f4",
            boxShadow: active ? "0 0 0 2px #e0244a" : "0 0 0 0.5px rgba(0,0,0,0.12)",
            transition: "box-shadow 200ms ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--faint)",
            fontSize: 13,
          }}
        >
          The browser appears here
        </div>
        <aside
          style={{
            width: 330,
            borderLeft: "0.5px solid rgba(0,0,0,0.08)",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <div style={{ padding: "14px 16px 6px" }}>
            <div className="lbl">Task</div>
            <div style={{ marginTop: 4, fontSize: 13, lineHeight: 1.45, color: "var(--ink-2)" }}>
              {run?.goal ?? run?.task ?? task ?? "Tell Claude what to do below."}
            </div>
          </div>
          <div
            className="scroll"
            style={{
              flex: 1,
              padding: "8px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {steps.map((s, i) => (
              <Step
                key={`${s.at}|${s.kind}|${s.text.slice(0, 20)}`}
                s={s}
                last={i === steps.length - 1 && active}
              />
            ))}
            {run?.status === "running" && (
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  color: "var(--muted)",
                  fontSize: 12,
                }}
              >
                <Spinner />
                working…
              </div>
            )}
          </div>
          {run?.status === "waiting" && run.ask && (
            <div
              className="pop"
              style={{
                margin: 12,
                padding: 14,
                borderRadius: 14,
                background: "#fffafb",
                boxShadow: "inset 0 0 0 1.5px #ff9fb6, 0 10px 24px rgba(224,36,74,0.12)",
              }}
            >
              <div className="lbl" style={{ color: "var(--accent)" }}>
                Claude needs your OK
              </div>
              <div style={{ marginTop: 6, fontWeight: 600, lineHeight: 1.4 }}>{run.ask.action}</div>
              {run.ask.preview && (
                <div
                  style={{
                    marginTop: 8,
                    padding: 10,
                    borderRadius: 10,
                    background: "#fff",
                    boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,0.12)",
                    fontSize: 13,
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                    userSelect: "text",
                  }}
                >
                  {run.ask.preview}
                </div>
              )}
              <input
                className="field"
                style={{ height: 36, fontSize: 13, marginTop: 10 }}
                placeholder="Reason, if you decline (optional)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                aria-label="Reason"
              />
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button
                  type="button"
                  className="primary btn"
                  style={{ flex: 1, height: 40 }}
                  onClick={() => void api().agentAnswer(true)}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="secondary btn"
                  style={{ height: 40 }}
                  onClick={() => {
                    void api().agentAnswer(false, reason);
                    setReason("");
                  }}
                >
                  Decline
                </button>
              </div>
            </div>
          )}
          <div
            style={{
              padding: 12,
              borderTop: "0.5px solid rgba(0,0,0,0.08)",
              display: "flex",
              gap: 8,
            }}
          >
            {!active && run?.task && (
              <button
                type="button"
                className="secondary btn"
                style={{ height: 40, whiteSpace: "nowrap" }}
                onClick={() =>
                  void api()
                    .agentStart(run.goal ?? run.task)
                    .then(setRun)
                }
              >
                Run again
              </button>
            )}
            {active ? (
              <button
                type="button"
                className="secondary btn"
                style={{ flex: 1, height: 40 }}
                onClick={() => void api().agentStop()}
              >
                Stop Claude
              </button>
            ) : (
              <>
                <input
                  className="field"
                  style={{ height: 40, fontSize: 13 }}
                  placeholder={
                    run
                      ? "Reply to Claude, it keeps the task"
                      : "Tell Claude what to do in the browser"
                  }
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  aria-label="Task for Claude"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && custom.trim()) {
                      void (
                        run ? api().agentReply(custom.trim()) : api().agentStart(custom.trim())
                      ).then(setRun);
                      setCustom("");
                    }
                  }}
                />
                <button
                  type="button"
                  className="primary btn"
                  style={{ height: 40 }}
                  disabled={!custom.trim()}
                  onClick={() => {
                    void (
                      run ? api().agentReply(custom.trim()) : api().agentStart(custom.trim())
                    ).then(setRun);
                    setCustom("");
                  }}
                >
                  Go
                </button>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
