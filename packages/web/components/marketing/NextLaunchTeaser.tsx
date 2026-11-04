// SPDX-License-Identifier: MIT

"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "../../lib/use-reduced-motion";

/** Home-page hook into the launch film on /next: a muted 8 s loop from the film (cliff -> "what if all of this lived in one place?") + one line. */
export function NextLaunchTeaser() {
  const reduced = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (reduced) vid.pause();
    else vid.play().catch(() => {});
  }, [reduced]);

  return (
    <a
      href="/next"
      className="group mx-auto mb-9 flex w-full max-w-[640px] flex-col overflow-hidden rounded-[22px] border border-[color:var(--hairline)] text-left shadow-[0_18px_50px_-24px_rgba(20,20,40,0.35)] backdrop-blur-md transition-transform hover:-translate-y-0.5 sm:flex-row sm:items-center md:mb-12"
      style={{ background: "color-mix(in srgb, var(--bg-elev) 82%, transparent)" }}
    >
      <div
        aria-hidden="true"
        className="relative aspect-video w-full shrink-0 overflow-hidden sm:w-[260px]"
      >
        <video
          ref={videoRef}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          src="/next/teaser-loop.mp4"
          poster="/next/teaser-poster.jpg"
          autoPlay={!reduced}
          muted
          loop
          playsInline
          preload="metadata"
          tabIndex={-1}
        />
      </div>
      <div className="flex flex-col gap-1.5 px-5 py-4 sm:py-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--coral)]">
          New · launch film
        </span>
        <span className="text-[17px] font-semibold leading-snug tracking-[-0.01em] text-[color:var(--text)]">
          A harness for go-to-market.
        </span>
        <span className="text-[14px] font-semibold text-[color:var(--text)]">
          See the new launch{" "}
          <span
            aria-hidden="true"
            className="inline-block transition-transform group-hover:translate-x-0.5"
          >
            →
          </span>
        </span>
      </div>
    </a>
  );
}
