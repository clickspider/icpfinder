// SPDX-License-Identifier: MIT
//
// PostHog funnel events for /next only. A no-op unless NEXT_PUBLIC_POSTHOG_KEY
// is set, so self-hosters send nothing. Memory persistence: no cookies, no
// browser storage. Events carry enums and counts, never form answers or email.

import type { PostHog } from "posthog-js";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";

let ph: Promise<PostHog> | null = null;

export function initPosthog() {
  if (!KEY || ph) return;
  ph = import("posthog-js").then(({ default: posthog }) => {
    posthog.init(KEY, { api_host: HOST, persistence: "memory", person_profiles: "never" });
    return posthog;
  });
}

export function capture(event: string, props?: Record<string, string | number | boolean>) {
  ph?.then((p) => p.capture(event, props));
}
