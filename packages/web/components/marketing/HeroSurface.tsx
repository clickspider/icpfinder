// SPDX-License-Identifier: MIT

"use client";

import { useEffect, useState } from "react";
import { useIcpRun } from "../../lib/use-icp-run";
import { useReducedMotion } from "../../lib/use-reduced-motion";
import { ByokPanel } from "../product/ByokPanel";
import { HeroChat } from "./HeroChat";
import { HeroDemoVideo } from "./HeroDemoVideo";

/**
 * Owns the shared run hook + BYOK dialog state. Lays out chat + demo video.
 *
 * Layout:
 *   - Mobile / md: stack — chat on top, video below, both 860px max.
 *   - lg+ AND idle: Hero B split — chat left (1.1fr), video right (0.9fr).
 *   - lg+ AND running/done: single column — chat reclaims full width.
 *
 * Anti-slop: video fades out the moment a real run starts (never canned proof
 * next to a live stream).
 */
export function HeroSurface() {
  const run = useIcpRun();
  const reduced = useReducedMotion();
  const idle = run.state.status === "idle";
  const [byokOpen, setByokOpen] = useState(false);

  // /#keys deep-link auto-opens the dialog on the marketing page too.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#keys") setByokOpen(true);
  }, []);

  return (
    <>
      <div
        className={`grid w-full items-start gap-10 ${
          idle ? "lg:grid-cols-[1.1fr_0.9fr] lg:gap-14" : "lg:grid-cols-1"
        }`}
      >
        <div className="min-w-0">
          <HeroChat run={run} onOpenByok={() => setByokOpen(true)} />
        </div>

        {idle ? (
          <div
            className="min-w-0 transition-[opacity,transform] motion-reduce:transition-none"
            style={{
              opacity: 1,
              transform: "translateY(0)",
              transitionDuration: reduced ? "0ms" : "260ms",
              transitionTimingFunction: "cubic-bezier(0.2, 0.7, 0.2, 1)",
            }}
          >
            <HeroDemoVideo className="mx-auto w-full max-w-[860px] lg:mx-0 lg:max-w-none" />
          </div>
        ) : null}
      </div>

      <ByokPanel
        open={byokOpen}
        onOpenChange={setByokOpen}
        geminiKey={run.geminiKey}
        hunterKey={run.hunterKey}
        onGeminiChange={run.setGeminiKey}
        onHunterChange={run.setHunterKey}
      />
    </>
  );
}
