// SPDX-License-Identifier: MIT
//
// Buffer + tee a FindEvent stream: yield each event downstream and also
// collect them in an array so the API route can stash a complete run in
// the KV cache once it terminates.

import type { FindEvent } from "@icpfinder/core";

export async function* teeEvents(
  source: AsyncIterable<FindEvent>,
  onComplete: (all: FindEvent[]) => void
): AsyncGenerator<FindEvent, void, void> {
  const buf: FindEvent[] = [];
  try {
    for await (const ev of source) {
      buf.push(ev);
      yield ev;
    }
  } finally {
    // Fire-and-forget: never let cache writes block stream close.
    try {
      onComplete(buf);
    } catch {
      // swallow
    }
  }
}

/**
 * Replay a captured event array as an async iterable so it can be piped
 * through the same SSE encoder as a live run.
 */
export async function* replayEvents(events: FindEvent[]): AsyncGenerator<FindEvent, void, void> {
  for (const ev of events) yield ev;
}
