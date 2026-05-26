// SPDX-License-Identifier: MIT

import { ImageResponse } from "next/og";

export const alt = "icpfinder — find the people who will pay for your idea";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OG() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#F7F5F0",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
        <svg width="80" height="80" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M 18 14 Q 8 32 18 50"
            stroke="#14B8A6"
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 46 14 Q 56 32 46 50"
            stroke="#14B8A6"
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="32" cy="33" r="7" fill="#F26B3D" />
        </svg>
        <span style={{ fontSize: "44px", fontWeight: 600, color: "#15161B", letterSpacing: "-0.02em" }}>
          icpfinder
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
        <div
          style={{
            fontSize: "76px",
            fontWeight: 600,
            color: "#15161B",
            letterSpacing: "-0.035em",
            lineHeight: 1.04,
            display: "flex",
            flexWrap: "wrap",
          }}
        >
          <span>find the people who&nbsp;</span>
          <span
            style={{
              background: "linear-gradient(110deg, #14B8A6 0%, #7C3AED 60%, #F26B3D 100%)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            will pay for your idea.
          </span>
        </div>
        <div
          style={{
            fontSize: "26px",
            color: "rgba(21, 22, 27, 0.62)",
            fontWeight: 500,
            display: "flex",
            gap: "20px",
            alignItems: "center",
          }}
        >
          <span>30s</span>
          <span>·</span>
          <span>free</span>
          <span>·</span>
          <span>MIT</span>
          <span>·</span>
          <span>no signup</span>
        </div>
      </div>

      <div
        style={{
          fontSize: "22px",
          color: "rgba(21, 22, 27, 0.38)",
          fontWeight: 500,
          display: "flex",
        }}
      >
        icpfinder.dev
      </div>
    </div>,
    size,
  );
}
