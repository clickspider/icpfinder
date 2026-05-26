// SPDX-License-Identifier: MIT

interface RunProgressProps {
  done: number;
  total: number;
  status: "idle" | "running" | "done" | "error";
}

export function RunProgress({ done, total, status }: RunProgressProps) {
  const safeTotal = total > 0 ? total : 3;
  const pct = Math.min(100, (done / safeTotal) * 100);
  if (status === "idle") return null;

  const failed = status === "error";

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={safeTotal}
      aria-valuenow={done}
      aria-valuetext={`${done} of ${safeTotal} archetypes ${status === "done" ? "complete" : "streaming"}`}
      className="relative h-[3px] w-full overflow-hidden"
      style={{ background: "var(--bg-card-hi)" }}
    >
      <div
        aria-hidden="true"
        className="absolute left-0 top-0 h-full transition-[width] duration-300 ease-out"
        style={{
          width: `${pct}%`,
          background: failed
            ? "var(--error)"
            : "linear-gradient(90deg, var(--mint-deep), var(--iris-deep))",
          boxShadow: failed ? "none" : "0 0 14px var(--mint-glow)",
        }}
      />
    </div>
  );
}
