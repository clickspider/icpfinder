// SPDX-License-Identifier: MIT

"use client";

import type { Archetype, Candidate } from "@icpfinder/core";
import type { RunStatus } from "../../lib/use-icp-run";
import { ArchetypeCard } from "./ArchetypeCard";

interface ArchetypeResultsGridProps {
  archetypeList: Archetype[];
  candidatesByArchetype: Map<string, Candidate[]>;
  status: RunStatus;
  className?: string;
}

export function ArchetypeResultsGrid({
  archetypeList,
  candidatesByArchetype,
  status,
  className = "grid gap-3 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
}: ArchetypeResultsGridProps) {
  if (archetypeList.length === 0) return null;
  return (
    <section aria-label="Run results" aria-live="polite" className={className}>
      {archetypeList.map((a, idx) => {
        const candidates = candidatesByArchetype.get(a.id) ?? [];
        const isLast = idx === archetypeList.length - 1;
        const cardStatus: "streaming" | "done" | "failed" =
          status === "error" && isLast
            ? "failed"
            : status === "running" && isLast
              ? "streaming"
              : "done";
        return (
          <ArchetypeCard
            key={a.id}
            archetype={a}
            candidates={candidates}
            status={cardStatus}
            index={idx}
          />
        );
      })}
    </section>
  );
}
