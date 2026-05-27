// SPDX-License-Identifier: MIT
//
// Minimal TODOS.md parser used by /roadmap. Server-only (uses node:fs).

import { readFile } from "node:fs/promises";
import { join } from "node:path";

export interface RoadmapItem {
  title: string;
  priority: string | null;
  description: string;
  completed: boolean;
  completedTag?: string;
}

export interface RoadmapSection {
  heading: string;
  items: RoadmapItem[];
}

interface RoadmapDoc {
  intro: string;
  sections: RoadmapSection[];
  completed: RoadmapItem[];
}

const ITEM_HEADING_RE = /^###\s+(.+?)\s*$/;
const PRIORITY_RE = /\*\*Priority:\*\*\s*(P\d)/;
const COMPLETED_TAG_RE = /\*\*Completed:\*\*\s*(.+?)\s*$/m;

function findRepoRoot(start: string): string {
  // Web app lives at packages/web; repo root is 2 levels up. In production
  // bundle this file is colocated; fall back to relative.
  return join(start, "..", "..");
}

export async function loadRoadmap(): Promise<RoadmapDoc> {
  const root = findRepoRoot(process.cwd());
  const candidates = [
    join(process.cwd(), "TODOS.md"),
    join(root, "TODOS.md"),
    join(process.cwd(), "..", "..", "TODOS.md"),
  ];
  let raw: string | null = null;
  for (const path of candidates) {
    try {
      raw = await readFile(path, "utf8");
      break;
    } catch {
      // try next
    }
  }
  if (!raw) {
    return { intro: "", sections: [], completed: [] };
  }

  const lines = raw.split("\n");
  let intro = "";
  const sections: RoadmapSection[] = [];
  const completed: RoadmapItem[] = [];

  let cursor: { kind: "intro" | "section" | "completed"; section?: RoadmapSection } = {
    kind: "intro",
  };
  let pendingItem: RoadmapItem | null = null;
  let pendingBodyLines: string[] = [];

  const flushPending = () => {
    if (!pendingItem) return;
    pendingItem.description = pendingBodyLines.join("\n").trim();
    const tag = pendingItem.description.match(COMPLETED_TAG_RE);
    if (tag) {
      pendingItem.completed = true;
      pendingItem.completedTag = tag[1];
      pendingItem.description = pendingItem.description.replace(COMPLETED_TAG_RE, "").trim();
    }
    if (cursor.kind === "completed" || pendingItem.completed) {
      completed.push(pendingItem);
    } else if (cursor.section) {
      cursor.section.items.push(pendingItem);
    }
    pendingItem = null;
    pendingBodyLines = [];
  };

  for (const line of lines) {
    if (line.startsWith("# ")) {
      // skip top-level title
      continue;
    }
    if (line.startsWith("## ")) {
      flushPending();
      const heading = line.replace(/^##\s+/, "").trim();
      if (/^completed$/i.test(heading)) {
        cursor = { kind: "completed" };
      } else {
        const section: RoadmapSection = { heading, items: [] };
        sections.push(section);
        cursor = { kind: "section", section };
      }
      continue;
    }
    if (line.startsWith("### ")) {
      flushPending();
      const match = line.match(ITEM_HEADING_RE);
      if (match) {
        pendingItem = {
          title: match[1] ?? "",
          priority: null,
          description: "",
          completed: false,
        };
      }
      continue;
    }
    if (pendingItem) {
      const pri = line.match(PRIORITY_RE);
      if (pri) {
        pendingItem.priority = pri[1] ?? null;
        continue;
      }
      pendingBodyLines.push(line);
      continue;
    }
    if (cursor.kind === "intro") {
      intro += `${line}\n`;
    } else if (cursor.kind === "completed") {
      const dashMatch = line.match(/^-\s+(.+)$/);
      if (dashMatch) {
        const text = dashMatch[1] ?? "";
        const tag = text.match(/\*\*Completed:\*\*\s*(.+?)\s*$/);
        const clean = text.replace(/\*\*Completed:\*\*\s*.+$/, "").trim();
        completed.push({
          title: clean.replace(/^\*\*(.+?)\*\*\s*(?:—|-)?\s*/, "$1 — "),
          priority: null,
          description: "",
          completed: true,
          completedTag: tag ? tag[1] : undefined,
        });
      }
    }
  }
  flushPending();

  return { intro: intro.trim(), sections, completed };
}
