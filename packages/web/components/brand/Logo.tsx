// SPDX-License-Identifier: MIT

interface LogoProps {
  size?: number;
}

function strokeWidthFor(size: number): number {
  if (size <= 16) return 7;
  if (size <= 24) return 6;
  if (size <= 48) return 5.5;
  if (size <= 64) return 5;
  if (size <= 96) return 4.5;
  return 3.5;
}

function dotRadiusFor(size: number): number {
  if (size <= 16) return 6;
  if (size <= 24) return 6.2;
  if (size <= 48) return 6.5;
  if (size <= 64) return 7;
  if (size <= 96) return 7.5;
  return 8;
}

export function Logo({ size = 32 }: LogoProps) {
  const sw = strokeWidthFor(size);
  const dr = dotRadiusFor(size);
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <path
        d="M 18 14 Q 8 32 18 50"
        stroke="var(--mint-deep)"
        strokeWidth={sw}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M 46 14 Q 56 32 46 50"
        stroke="var(--mint-deep)"
        strokeWidth={sw}
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="32" cy="33" r={dr} fill="var(--coral)" />
    </svg>
  );
}
