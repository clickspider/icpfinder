// SPDX-License-Identifier: MIT

import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#F7F5F0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg width="32" height="32" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M 18 14 Q 8 32 18 50"
          stroke="#14B8A6"
          strokeWidth="7"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 46 14 Q 56 32 46 50"
          stroke="#14B8A6"
          strokeWidth="7"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="32" cy="33" r="6" fill="#F26B3D" />
      </svg>
    </div>,
    size,
  );
}
