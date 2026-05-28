// SPDX-License-Identifier: MIT

"use client";

import type { Archetype, Candidate, DeepenResult } from "@icpfinder/core";
import { useState } from "react";
import { formatCostCents } from "../../lib/format-cost";
import { sanitizeProvenanceUrl } from "../../lib/sanitize-url";
import type { ArchetypeStatus } from "../../lib/use-icp-run";

type StreamingStatus = "streaming" | "done" | "failed";

interface ArchetypeCardProps {
  archetype: Archetype;
  candidates: Candidate[];
  status: StreamingStatus;
  index: number;
  costCents?: number;
  /** Phase-2 enrichment status. Optional for back-compat with callers that
   * don't yet wire two-phase (e.g. early snapshot tests). */
  archetypeStatus?: ArchetypeStatus;
  /** Map of candidateId → deepen result. */
  deepenResults?: Map<string, DeepenResult>;
  /** Candidates currently waiting on /api/deepen. */
  deepenInFlight?: Set<string>;
  /** candidateId → copied outreach (rendered with inline tick when present). */
  outreachByCandidate?: Map<string, string>;
  onEnrich?: (archetypeId: string) => void;
  onDeepen?: (candidate: Candidate) => void;
  onMoreContacts?: (archetypeId: string) => void;
  onCopyOutreach?: (candidate: Candidate, archetype: Archetype) => void;
}

export function ArchetypeCard({
  archetype,
  candidates,
  status,
  index,
  costCents,
  archetypeStatus,
  deepenResults,
  deepenInFlight,
  outreachByCandidate,
  onEnrich,
  onDeepen,
  onMoreContacts,
  onCopyOutreach,
}: ArchetypeCardProps) {
  const numLabel = String(index + 1).padStart(3, "0");
  const headingId = `archetype-${archetype.id}-heading`;
  // D2: reasoning default-collapsed on ALL cards.
  const [reasoningOpen, setReasoningOpen] = useState(false);
  // D7: objections default-collapsed.
  const [objectionsOpen, setObjectionsOpen] = useState(false);
  // D5: inline tick after copy.
  const [tickCandidate, setTickCandidate] = useState<string | null>(null);

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

  const isAwaitingPick = archetypeStatus === "awaiting-pick" && Boolean(onEnrich);
  const isEnriching =
    archetypeStatus === "enriching" || archetypeStatus === "enriching-more";

  const handleCopy = (candidate: Candidate) => {
    if (!onCopyOutreach) return;
    onCopyOutreach(candidate, archetype);
    setTickCandidate(candidate.id);
    window.setTimeout(() => {
      setTickCandidate((cur) => (cur === candidate.id ? null : cur));
    }, 1500);
  };

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
      <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-[13px] font-medium text-[color:var(--text-muted)]">
        <span>{archetype.industry} · {archetype.companySize}</span>
        {archetype.reasoning ? (
          <button
            type="button"
            onClick={() => setReasoningOpen((v) => !v)}
            aria-expanded={reasoningOpen}
            aria-controls={`${archetype.id}-reasoning`}
            className="text-[12px] font-semibold text-[color:var(--mint-deep)] hover:underline"
          >
            · {reasoningOpen ? "hide" : "why this ICP →"}
          </button>
        ) : null}
      </p>
      {reasoningOpen && archetype.reasoning ? (
        <p
          id={`${archetype.id}-reasoning`}
          className="mt-2 rounded-[10px] border border-[color:var(--hairline)] bg-[color:var(--bg-card-hi)] px-3 py-2 text-[12px] leading-[1.5] text-[color:var(--text-muted)]"
        >
          {archetype.reasoning}
        </p>
      ) : null}

      {archetype.pain ? (
        <p className="mt-2.5 text-[14px] text-[color:var(--text)]">{archetype.pain}</p>
      ) : null}

      {archetype.sellingAngle ? (
        <div
          className="mt-3 rounded-[12px] border px-3 py-2 text-[13px] leading-[1.5]"
          style={{
            borderColor: "color-mix(in srgb, var(--mint-deep) 24%, transparent)",
            background: "color-mix(in srgb, var(--mint-deep) 6%, transparent)",
            color: "var(--text)",
          }}
        >
          <span
            className="mr-1.5 text-[10px] font-bold uppercase tracking-[0.16em]"
            style={{ color: "var(--mint-deep)" }}
          >
            Pitch angle ·
          </span>
          {archetype.sellingAngle}
        </div>
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

      {archetype.objections && archetype.objections.length > 0 ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setObjectionsOpen((v) => !v)}
            aria-expanded={objectionsOpen}
            aria-controls={`${archetype.id}-objections`}
            className="text-[12px] font-medium italic text-[color:var(--text-muted)] hover:text-[color:var(--text)]"
          >
            {objectionsOpen ? "▾" : "▸"} Likely objections ({archetype.objections.length})
          </button>
          {objectionsOpen ? (
            <ul
              id={`${archetype.id}-objections`}
              className="mt-1.5 grid gap-1 pl-3 text-[12px] italic text-[color:var(--text-muted)]"
            >
              {archetype.objections.map((o) => (
                <li key={o}>— {o}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {/* Phase-2 awaiting-pick CTA */}
      {isAwaitingPick && candidates.length === 0 ? (
        <button
          type="button"
          onClick={() => onEnrich?.(archetype.id)}
          className="mt-4 inline-flex h-11 min-h-[44px] w-full items-center justify-center gap-1.5 rounded-full px-4 text-[13px] font-semibold text-white transition-transform hover:-translate-y-px active:scale-[0.97]"
          style={{
            background: "linear-gradient(95deg, var(--mint-deep), var(--iris-deep))",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.5) inset, 0 8px 20px -6px var(--iris-glow)",
          }}
        >
          <span className="truncate">Find 5 verified emails · ~3s</span>
          <span aria-hidden="true">→</span>
        </button>
      ) : null}

      {candidates.length > 0 ? (
        <ul className="mt-3 grid gap-1.5 text-[13px]" aria-label="Verified contacts">
          {candidates.map((c) => {
            const deepen = deepenResults?.get(c.id);
            const inFlight = deepenInFlight?.has(c.id);
            const draft = outreachByCandidate?.get(c.id);
            const showTick = tickCandidate === c.id;
            return (
              <li
                key={c.id}
                className="rounded-[10px] border border-[color:var(--hairline)] bg-[color:var(--bg-card-hi)] px-2.5 py-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-[color:var(--text)]">{c.companyName}</div>
                    <div className="font-mono text-[12px] text-[color:var(--mint-deep)] break-all">
                      <span className="font-sans font-bold">→ </span>
                      {c.contactEmail ?? c.domain}
                    </div>
                    <div className="text-[11px] text-[color:var(--text-muted)] tabular">
                      {c.contactFirstName ?? "?"} {c.contactLastName ?? ""}
                      {c.emailConfidence ? ` · confidence ${c.emailConfidence}` : ""}
                    </div>
                    {c.whyNow ? (
                      <p className="mt-1 text-[12px] italic text-[color:var(--text-muted)]">
                        Why now: {c.whyNow}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {onDeepen ? (
                      <button
                        type="button"
                        onClick={() => onDeepen(c)}
                        disabled={inFlight}
                        className="inline-flex h-7 min-h-[28px] items-center gap-0.5 rounded-full border border-[color:var(--hairline-2)] bg-[color:var(--bg-elev)] px-2 text-[11px] font-medium text-[color:var(--mint-deep)] hover:bg-[color:var(--bg-card-hi)] disabled:opacity-50"
                      >
                        {inFlight ? "…" : "↗ Deepen"}
                      </button>
                    ) : null}
                    {onCopyOutreach ? (
                      <button
                        type="button"
                        onClick={() => handleCopy(c)}
                        aria-label={showTick ? "Copied!" : "Copy outreach"}
                        title={draft ?? "Copy outreach"}
                        className="inline-flex h-7 min-h-[28px] items-center justify-center rounded-full border border-[color:var(--hairline-2)] bg-[color:var(--bg-elev)] px-2 text-[11px] text-[color:var(--text-muted)] hover:bg-[color:var(--bg-card-hi)]"
                      >
                        {showTick ? (
                          <span style={{ color: "var(--mint-deep)" }}>✓</span>
                        ) : (
                          <span aria-hidden="true">⧉</span>
                        )}
                      </button>
                    ) : null}
                  </div>
                </div>
                {deepen ? (
                  <div className="mt-2 rounded-[8px] border border-[color:var(--hairline)] bg-[color:var(--bg-card)] px-2.5 py-2 text-[12px] leading-[1.5]">
                    <div className="font-semibold text-[color:var(--text)]">
                      Trigger: <span className="font-normal">{deepen.trigger}</span>
                    </div>
                    {deepen.provenanceUrl ? (
                      <div className="mt-0.5 text-[11px] text-[color:var(--text-muted)]">
                        Source:{" "}
                        <a
                          href={sanitizeProvenanceUrl(deepen.provenanceUrl) ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:text-[color:var(--text)]"
                        >
                          {new URL(deepen.provenanceUrl).host}
                        </a>
                      </div>
                    ) : null}
                    {deepen.dossier ? (
                      <p className="mt-1 text-[color:var(--text-muted)]">{deepen.dossier}</p>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : isEnriching ? (
        <ul className="mt-3 grid gap-1.5" aria-label="Loading candidates">
          {[0, 1, 2].map((i) => (
            <li
              key={i}
              className="h-12 animate-pulse rounded-[10px] border border-[color:var(--hairline)] bg-[color:var(--bg-card-hi)]"
            />
          ))}
        </ul>
      ) : status === "streaming" ? (
        <p className="mt-3 text-[12px] text-[color:var(--text-dim)]">→ looking up contacts…</p>
      ) : null}

      {onMoreContacts && candidates.length > 0 ? (
        <button
          type="button"
          onClick={() => onMoreContacts(archetype.id)}
          disabled={archetypeStatus === "enriching-more"}
          className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-full border border-dashed border-[color:var(--hairline-2)] bg-transparent px-3 text-[12px] font-medium text-[color:var(--text-muted)] hover:bg-[color:var(--bg-card-hi)] hover:text-[color:var(--text)] disabled:opacity-50"
        >
          {archetypeStatus === "enriching-more"
            ? "Loading more…"
            : "+ more contacts in this archetype"}
        </button>
      ) : null}
    </article>
  );
}
