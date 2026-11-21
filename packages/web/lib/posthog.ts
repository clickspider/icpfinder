// SPDX-License-Identifier: MIT
//
// PostHog funnel events for /next only. A no-op unless NEXT_PUBLIC_POSTHOG_KEY
// is set, so self-hosters send nothing and never see the consent bar.
// Before a choice and after Decline: memory persistence (no cookies, no browser
// storage by PostHog) and no session replay. After Accept: a PostHog cookie and
// localStorage entry for return visits, and session replay with every input and
// textarea masked. Events carry enums and counts, never form answers or email.

import type { PostHog } from "posthog-js";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";
/** The visitor's answer, kept by us (not PostHog): "yes" or "no". */
const STORE = "icpf_consent";

export const analyticsOn = Boolean(KEY);

let ph: Promise<PostHog> | null = null;

export function savedConsent(): "yes" | "no" | null {
  try {
    const v = localStorage.getItem(STORE);
    return v === "yes" || v === "no" ? v : null;
  } catch {
    return null;
  }
}

export function initPosthog() {
  if (!KEY || ph) return;
  const choice = savedConsent();
  const yes = choice === "yes";
  ph = import("posthog-js").then(({ default: posthog }) => {
    posthog.init(KEY, {
      api_host: HOST,
      persistence: yes ? "localStorage+cookie" : "memory",
      person_profiles: "never",
      disable_session_recording: !yes,
      session_recording: { maskAllInputs: true },
    });
    posthog.register({ consent: choice ?? "none" });
    return posthog;
  });
}

/** Accept: cookie + replay. Decline (also after an Accept): back to memory, replay stops. */
export function setConsent(yes: boolean) {
  try {
    localStorage.setItem(STORE, yes ? "yes" : "no");
  } catch {}
  ph?.then((p) => {
    if (yes) {
      p.set_config({ persistence: "localStorage+cookie" });
      p.startSessionRecording();
    } else {
      p.stopSessionRecording();
      p.set_config({ persistence: "memory" });
    }
    p.register({ consent: yes ? "yes" : "no" });
    p.capture("consent", { choice: yes ? "accept" : "decline" });
  });
}

export function capture(event: string, props?: Record<string, string | number | boolean>) {
  ph?.then((p) => p.capture(event, props));
}
