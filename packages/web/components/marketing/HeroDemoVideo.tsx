// SPDX-License-Identifier: MIT

"use client";

import { useEffect, useRef, useState } from "react";
import {
  HERO_VIDEO_AVAILABLE,
  HERO_VIDEO_MP4,
  HERO_VIDEO_POSTER,
  HERO_VIDEO_WEBM,
} from "../../lib/hero-video";
import { useReducedMotion } from "../../lib/use-reduced-motion";

const MUTE_LS_KEY = "icpfinder:videoMuted";

interface HeroDemoVideoProps {
  /** Wrapper className override — used by Hero B split column to lift the 860px cap. */
  className?: string;
  /** Caption alignment. */
  captionAlign?: "center" | "right";
}

export function HeroDemoVideo({
  className = "mx-auto mt-10 w-full max-w-[860px] md:mt-12",
  captionAlign = "center",
}: HeroDemoVideoProps) {
  const reduced = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  // Hydrate the user's last unmute choice. We never auto-unmute on first load
  // (browser autoplay policy will pause the video). The first user gesture
  // (clicking the pill) handles unmute imperatively below.
  useEffect(() => {
    try {
      // Pre-populate the visual state if user previously chose unmuted, so the
      // pill renders in the right state. Actual unmuting waits for click.
      if (window.localStorage.getItem(MUTE_LS_KEY) === "0") {
        // Reflect intent in the icon — but keep `muted` true on the element
        // until a real gesture fires. The click handler will sync videoRef.
      }
    } catch {
      // localStorage may be disabled
    }
  }, []);

  const toggleMuted = () => {
    const vid = videoRef.current;
    if (!vid) return;
    const next = !muted;
    // Imperative: set the property AND attempt play in the same gesture so
    // browsers credit the user-activation and allow audio.
    vid.muted = next;
    setMuted(next);
    try {
      window.localStorage.setItem(MUTE_LS_KEY, next ? "1" : "0");
    } catch {
      // ignore
    }
    if (!next) {
      // Unmuting: explicitly call play() with the gesture still on the stack.
      // If the browser still blocks (it shouldn't), revert to muted so the
      // video doesn't pause silently.
      const playPromise = vid.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {
          vid.muted = true;
          setMuted(true);
        });
      }
    }
  };

  if (!HERO_VIDEO_AVAILABLE) return null;

  const captionClass =
    captionAlign === "right"
      ? "mt-2 text-right text-[12px] text-[color:var(--text-dim)]"
      : "mt-2 text-center text-[12px] text-[color:var(--text-dim)]";

  return (
    <figure aria-label="ICP finder demo recording" className={className}>
      <div
        className="relative overflow-hidden rounded-[28px] border border-[color:var(--hairline-2)]"
        style={{ boxShadow: "0 1px 2px rgba(15,16,20,0.04), 0 20px 60px -28px var(--iris-glow)" }}
      >
        <video
          ref={videoRef}
          autoPlay={!reduced}
          loop={!reduced}
          muted
          playsInline
          preload="metadata"
          controls={reduced}
          poster={HERO_VIDEO_POSTER || undefined}
          className="block h-auto w-full"
        >
          {HERO_VIDEO_WEBM ? <source src={HERO_VIDEO_WEBM} type="video/webm" /> : null}
          {HERO_VIDEO_MP4 ? <source src={HERO_VIDEO_MP4} type="video/mp4" /> : null}
        </video>

        {/* Mute/unmute pill — only shown when we own playback (not when native controls are visible). */}
        {!reduced ? (
          <button
            type="button"
            onClick={toggleMuted}
            aria-label={muted ? "Unmute demo" : "Mute demo"}
            aria-pressed={!muted}
            className="absolute right-3 bottom-3 inline-flex h-10 items-center gap-1.5 rounded-full border border-[color:var(--hairline-2)] px-3 text-[12px] font-medium text-[color:var(--text-muted)] backdrop-blur-md transition-colors hover:text-[color:var(--text)] focus-visible:text-[color:var(--text)]"
            style={{ background: "color-mix(in srgb, var(--bg-elev) 80%, transparent)" }}
          >
            {muted ? (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                style={{ color: "var(--mint-deep)" }}
              >
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              </svg>
            )}
            <span>{muted ? "Sound off" : "Sound on"}</span>
          </button>
        ) : null}
      </div>
      <figcaption className={captionClass}>demo — 30s, 3 archetypes, verified emails</figcaption>
    </figure>
  );
}
