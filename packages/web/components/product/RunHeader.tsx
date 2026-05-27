// SPDX-License-Identifier: MIT

import { formatCostCents } from "../../lib/format-cost";

interface RunHeaderProps {
  status: "idle" | "running" | "done" | "error";
  archetypeCount: number;
  totalCostCents: number;
  elapsedMs: number;
  byok: boolean;
  runId?: string;
}

function formatElapsed(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function RunHeader({
  status,
  archetypeCount,
  totalCostCents,
  elapsedMs,
  byok,
  runId,
}: RunHeaderProps) {
  if (status === "idle") return null;

  const dotColor =
    status === "running"
      ? "var(--mint-deep)"
      : status === "error"
        ? "var(--error)"
        : "var(--mint-deep)";
  const dotGlow = status === "running" ? "0 0 10px var(--mint-glow)" : "0 0 6px var(--mint-glow)";

  return (
    <div
      className="flex flex-wrap items-center gap-3 rounded-[14px] border border-[color:var(--hairline)] bg-[color:var(--bg-card)] px-4 py-3 text-[13px] text-[color:var(--text-muted)] tabular"
      style={{ boxShadow: "0 1px 2px rgba(15,16,20,0.04)" }}
      aria-live="polite"
    >
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--hairline)] bg-[color:var(--bg-card-hi)] px-2.5 py-1 text-[11px] font-medium">
        run ·{" "}
        <span className="font-bold text-[color:var(--mint-deep)] tabular">{runId ?? "—"}</span>
      </span>
      <span
        className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em]"
        style={{ color: dotColor }}
      >
        <span
          aria-hidden="true"
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{
            background: dotColor,
            boxShadow: dotGlow,
            animation: status === "running" ? "icp-pulse 1100ms ease-in-out infinite" : undefined,
          }}
        />
        {status}
      </span>
      <span aria-hidden="true">·</span>
      <span>{formatElapsed(elapsedMs)}</span>
      <span aria-hidden="true">·</span>
      <span>
        {archetypeCount} {archetypeCount === 1 ? "archetype" : "archetypes"}
      </span>
      <span aria-hidden="true">·</span>
      <span className="text-[color:var(--coral)] font-bold">{formatCostCents(totalCostCents)}</span>
      <span aria-hidden="true">·</span>
      <span>{byok ? "byok" : "free demo"}</span>
    </div>
  );
}
