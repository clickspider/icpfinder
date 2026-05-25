// SPDX-License-Identifier: MIT
//
// SSE encoder helpers. The Next.js route handler reads chunks from
// the IcpFinder async generator and pipes them through encodeEvent
// into a TransformStream.

import type { FindEvent } from "@icpfinder/core";

const TEXT_ENCODER = new TextEncoder();

/**
 * Encode a single FindEvent as an SSE frame. We use `event: <type>`
 * so the browser EventSource API can subscribe by event name, and
 * `data:` carries the JSON payload. Trailing blank line is the SSE
 * frame separator.
 */
export const encodeEvent = (event: FindEvent): Uint8Array => {
  const frame = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
  return TEXT_ENCODER.encode(frame);
};

/** Heartbeat comment frame — keeps proxies from closing idle connections. */
export const encodeHeartbeat = (): Uint8Array => TEXT_ENCODER.encode(`: ping\n\n`);

/**
 * Convert an async-iterable of FindEvent into a ReadableStream of
 * SSE bytes. Honors AbortSignal — when the consumer disconnects,
 * the underlying generator is awaited to completion (its own signal
 * has already been aborted via the same controller).
 */
export const sseStreamFromEvents = (
  events: AsyncIterable<FindEvent>,
  opts?: { heartbeatMs?: number }
): ReadableStream<Uint8Array> => {
  const heartbeatMs = opts?.heartbeatMs ?? 15_000;
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encodeHeartbeat());
        } catch {
          // Stream already closed; clear interval below.
        }
      }, heartbeatMs);

      try {
        for await (const event of events) {
          controller.enqueue(encodeEvent(event));
        }
      } catch (err) {
        controller.enqueue(
          encodeEvent({
            type: "error",
            message: err instanceof Error ? err.message : String(err),
            recoverable: false,
          })
        );
      } finally {
        if (heartbeat) clearInterval(heartbeat);
        controller.close();
      }
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
    },
  });
};
