// SPDX-License-Identifier: MIT

"use client";

import type { Archetype, Candidate, DeepenResult } from "@icpfinder/core";
import type { ArchetypeStatus, RunStatus } from "../../lib/use-icp-run";
import { ArchetypeCard } from "./ArchetypeCard";

interface ArchetypeResultsGridProps {
  archetypeList: Archetype[];
  candidatesByArchetype: Map<string, Candidate[]>;
  status: RunStatus;
  className?: string;
  archetypeStatus?: Map<string, ArchetypeStatus>;
  deepenResults?: Map<string, DeepenResult>;
  deepenInFlight?: Set<string>;
  outreachByCandidate?: Map<string, string>;
  onEnrich?: (archetypeId: string) => void;
  onDeepen?: (candidate: Candidate) => void;
  onMoreContacts?: (archetypeId: string) => void;
  onCopyOutreach?: (candidate: Candidate, archetype: Archetype) => void;
}

export function ArchetypeResultsGrid({
  archetypeList,
  candidatesByArchetype,
  status,
  className = "grid gap-3 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  archetypeStatus,
  deepenResults,
  deepenInFlight,
  outreachByCandidate,
  onEnrich,
  onDeepen,
  onMoreContacts,
  onCopyOutreach,
}: ArchetypeResultsGridProps) {
  if (archetypeList.length === 0) return null;
  return (
    <section aria-label="Run results" aria-live="polite" className={className}>
      {archetypeList.map((a, idx) => {
        const candidates = candidatesByArchetype.get(a.id) ?? [];
        const archStatus = archetypeStatus?.get(a.id);
        const isLast = idx === archetypeList.length - 1;
        const cardStatus: "streaming" | "done" | "failed" =
          archStatus === "error"
            ? "failed"
            : archStatus === "enriching" || archStatus === "enriching-more"
              ? "streaming"
              : status === "error" && isLast
                ? "failed"
                : status === "running" && isLast && !archStatus
                  ? "streaming"
                  : "done";
        return (
          <ArchetypeCard
            key={a.id}
            archetype={a}
            candidates={candidates}
            status={cardStatus}
            index={idx}
            archetypeStatus={archStatus}
            deepenResults={deepenResults}
            deepenInFlight={deepenInFlight}
            outreachByCandidate={outreachByCandidate}
            onEnrich={onEnrich}
            onDeepen={onDeepen}
            onMoreContacts={onMoreContacts}
            onCopyOutreach={onCopyOutreach}
          />
        );
      })}
    </section>
  );
}
