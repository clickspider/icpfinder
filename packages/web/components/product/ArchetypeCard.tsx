// SPDX-License-Identifier: MIT

import type { Archetype, Candidate } from "@icpfinder/core";
import { formatCostCents } from "../../lib/format-cost";

type Status = "streaming" | "done" | "failed";

interface ArchetypeCardProps {
  archetype: Archetype;
  candidates: Candidate[];
  status: Status;
  index: number;
  costCents?: number;
}

export function ArchetypeCard({
  archetype,
  candidates,
  status,
  index,
  costCents,
}: ArchetypeCardProps) {
  const numLabel = String(index + 1).padStart(3, "0");
  const headingId = `archetype-${archetype.id}-heading`;

  const statusColor =
    status === "streaming"
      ? "var(--coral)"
      : status === "failed"
        ? "var(--error)"
        : "var(--mint-deep)";
  const statusGlow =
    status === "streaming"
      ? "0 0 6px var(--coral-glow)"
      : status === "failed"
        ? "none"
        : "0 0 6px var(--mint-glow)";

  return (
    <article
      aria-labelledby={headingId}
      className="rounded-[14px] border border-[color:var(--hairline)] bg-[color:var(--bg-card)] p-4 transition-all hover:-translate-y-px"
      style={{
        boxShadow:
          status === "streaming"
            ? "0 8px 24px -8px var(--coral-glow)"
            : "0 1px 2px rgba(15,16,20,0.04), 0 4px 16px rgba(15,16,20,0.04)",
        borderColor:
          status === "streaming" ? "color-mix(in srgb, var(--coral) 30%, transparent)" : undefined,
      }}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--hairline)] bg-[color:var(--bg-card-hi)] px-2.5 py-1 text-[11px] font-medium text-[color:var(--text-muted)]">
          archetype{" "}
          <span className="font-bold text-[color:var(--mint-deep)] tabular">{numLabel}</span>
        </span>
        <span
          className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em]"
          style={{ color: statusColor }}
        >
          <span
            aria-hidden="true"
            className="inline-block h-1 w-1 rounded-full"
            style={{
              background: statusColor,
              boxShadow: statusGlow,
              animation:
                status === "streaming" ? "icp-pulse 1100ms ease-in-out infinite" : undefined,
            }}
          />
          {status}
          {typeof costCents === "number" ? (
            <>
              {" "}
              · <span className="tabular">{formatCostCents(costCents)}</span>
            </>
          ) : null}
        </span>
      </div>

      <h3
        id={headingId}
        className="text-[16px] font-semibold tracking-[-0.005em] text-[color:var(--text)]"
      >
        {archetype.role}
      </h3>
      <p className="mt-0.5 text-[13px] font-medium text-[color:var(--text-muted)]">
        {archetype.industry} · {archetype.companySize}
      </p>
      {archetype.pain ? (
        <p className="mt-2.5 text-[14px] text-[color:var(--text)]">{archetype.pain}</p>
      ) : null}

      {archetype.buyingSignals && archetype.buyingSignals.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {archetype.buyingSignals.map((signal) => (
            <li
              key={signal}
              className="rounded-full border border-[color:var(--hairline)] bg-[color:var(--bg-card-hi)] px-2 py-0.5 text-[11px] text-[color:var(--text-muted)]"
            >
              {signal}
            </li>
          ))}
        </ul>
      ) : null}

      {candidates.length > 0 ? (
        <ul className="mt-3 grid gap-1.5 text-[13px]" aria-label="Verified contacts">
          {candidates.map((c) => (
            <li
              key={c.id}
              className="rounded-[10px] border border-[color:var(--hairline)] bg-[color:var(--bg-card-hi)] px-2.5 py-2"
            >
              <div className="font-semibold text-[color:var(--text)]">{c.companyName}</div>
              <div className="font-mono text-[12px] text-[color:var(--mint-deep)] break-all">
                <span className="font-sans font-bold">→ </span>
                {c.contactEmail ?? c.domain}
              </div>
              <div className="text-[11px] text-[color:var(--text-muted)] tabular">
                {c.contactFirstName ?? "?"} {c.contactLastName ?? ""}
                {c.emailConfidence ? ` · confidence ${c.emailConfidence}` : ""}
              </div>
            </li>
          ))}
        </ul>
      ) : status === "streaming" ? (
        <p className="mt-3 text-[12px] text-[color:var(--text-dim)]">→ looking up contacts…</p>
      ) : null}
    </article>
  );
}
