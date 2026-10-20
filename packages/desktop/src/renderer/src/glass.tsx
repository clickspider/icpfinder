// SPDX-License-Identifier: MIT
//
// The onboarding look: a slow marble stage, frosted glass cards on it, and
// hand-drawn duotone icons in the logo colours (teal + one coral accent).

import type { ReactNode } from "react";

const T = "#0f9384";
const TF = "rgba(20,184,166,.14)";
const C = "#F26B3D";
const CF = "rgba(242,107,61,.16)";

/** Living marble background: a turbulence-warped gradient that drifts slowly. */
export const Marble = ({ children }: { children?: ReactNode }) => (
  <div className="marble">
    <svg
      className="marble-bg"
      viewBox="0 0 840 840"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <filter id="marble-f" x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.004 0.007"
            numOctaves="3"
            seed="11"
            result="n"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="n"
            scale="320"
            xChannelSelector="R"
            yChannelSelector="G"
          />
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <linearGradient id="marble-g" x1="0" y1="0" x2=".22" y2=".3" spreadMethod="reflect">
          <stop offset="0" stopColor="#ff4f73" />
          <stop offset=".35" stopColor="#ff8fa6" />
          <stop offset=".55" stopColor="#fff5f6" />
          <stop offset=".75" stopColor="#ffb08a" />
          <stop offset="1" stopColor="#ff6f61" />
        </linearGradient>
      </defs>
      <rect
        x="-200"
        y="-200"
        width="1240"
        height="1240"
        fill="url(#marble-g)"
        filter="url(#marble-f)"
      />
    </svg>
    <div className="marble-in">{children}</div>
  </div>
);

export const Glass = ({
  children,
  width,
  className = "",
}: {
  children: ReactNode;
  width?: number;
  className?: string;
}) => (
  <div className={`glass pop ${className}`} style={{ width }}>
    {children}
  </div>
);

/** A frosted "document": title, a small status pill, and # sections. */
export const Doc = ({
  title,
  pill,
  done,
  icon,
  sections,
  width = 520,
}: {
  title: string;
  pill: string;
  done?: boolean;
  /** A DUO icon key shown in the pill instead of a dot. */
  icon?: string;
  sections: Array<[string, string | null]>;
  width?: number;
}) => (
  <Glass width={width} className="doc">
    <div className="doc-head">
      <b>{title}</b>
      <span className={`gpill ${done ? "gp-ok" : "gp-live"}`}>
        {icon ? DUO[icon]?.(13) : done ? "✓" : "●"} {pill}
      </span>
    </div>
    <div className="paper">
      {sections.map(([h, body]) => (
        <div key={h} className="rise">
          <h4># {h}</h4>
          {body ? (
            <div>{body}</div>
          ) : (
            <>
              <div className="sk" style={{ width: "62%" }} />
              <div className="sk" style={{ width: "38%" }} />
            </>
          )}
        </div>
      ))}
    </div>
  </Glass>
);

/** The product card born on the stage: logo orb, name in a soft field, a small tag. */
export const ProductCard = ({
  logo,
  name,
  tag,
}: {
  logo: ReactNode;
  name: string;
  tag: ReactNode;
}) => (
  <Glass width={200} className="pcard">
    <div className="orb">{logo}</div>
    <div className="namefield">{name}</div>
    <span className="gtag">{tag}</span>
  </Glass>
);

const svg = (body: ReactNode, size = 34) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {body}
  </svg>
);

/** Hand-drawn duotone icons. Teal body, one coral detail. */
export const DUO: Record<string, (size?: number) => ReactNode> = {
  B2B: (s) =>
    svg(
      <>
        <rect x="5" y="9" width="10" height="18" rx="2" fill={TF} stroke={T} strokeWidth="1.6" />
        <rect x="17" y="5" width="10" height="22" rx="2" fill={TF} stroke={T} strokeWidth="1.6" />
        <circle cx="10" cy="14" r="1.3" fill={C} />
        <circle cx="10" cy="19" r="1.3" fill={T} />
        <circle cx="22" cy="10" r="1.3" fill={T} />
        <circle cx="22" cy="15" r="1.3" fill={C} />
        <circle cx="22" cy="20" r="1.3" fill={T} />
        <path d="M3 27h26" stroke={T} strokeWidth="1.6" />
      </>,
      s
    ),
  B2C: (s) =>
    svg(
      <>
        <circle cx="14" cy="11" r="5" fill={TF} stroke={T} strokeWidth="1.6" />
        <path d="M5 27c1.2-5.5 4.6-8 9-8s7.8 2.5 9 8" fill={TF} stroke={T} strokeWidth="1.6" />
        <path
          d="M25 6.5c-1-1.6-3.6-1-3.4 1 .2 1.7 3.4 3.5 3.4 3.5s3.2-1.8 3.4-3.5c.2-2-2.4-2.6-3.4-1z"
          fill={C}
        />
      </>,
      s
    ),
  B2B2C: (s) =>
    svg(
      <>
        <rect x="3" y="8" width="10" height="19" rx="2" fill={TF} stroke={T} strokeWidth="1.6" />
        <circle cx="8" cy="14" r="1.3" fill={T} />
        <circle cx="8" cy="19" r="1.3" fill={T} />
        <path d="M14.5 17h5m-2-2.5 2.5 2.5-2.5 2.5" stroke={C} strokeWidth="1.8" />
        <circle cx="25" cy="13" r="3.5" fill={TF} stroke={T} strokeWidth="1.6" />
        <path d="M19.5 27c.7-4 2.8-6 5.5-6s4.8 2 5.5 6" stroke={T} strokeWidth="1.6" />
      </>,
      s
    ),
  Marketplace: (s) =>
    svg(
      <>
        <path d="M9 7Q3 16 9 25M23 7q6 9 0 18" stroke={T} strokeWidth="2.2" />
        <circle cx="16" cy="16" r="3.4" fill={C} />
        <circle cx="16" cy="16" r="7.5" stroke={T} strokeWidth="1.2" strokeDasharray="2 3" />
      </>,
      s
    ),
  Idea: (s) =>
    svg(
      <>
        <path
          d="M16 4a8 8 0 00-4.6 14.6V22h9.2v-3.4A8 8 0 0016 4z"
          fill={TF}
          stroke={T}
          strokeWidth="1.6"
        />
        <path d="M12.5 26h7M14 29h4" stroke={T} strokeWidth="1.6" />
        <path d="M14 15l2-3 2 3" stroke={C} strokeWidth="1.8" />
      </>,
      s
    ),
  "Pre-seed": (s) =>
    svg(
      <>
        <path d="M4 25h24" stroke={T} strokeWidth="1.6" />
        <path
          d="M16 23c-3.5 0-5.5-2.4-5.5-5.3C10.5 13.5 16 8 16 8s5.5 5.5 5.5 9.7C21.5 20.6 19.5 23 16 23z"
          fill={CF}
          stroke={C}
          strokeWidth="1.6"
        />
        <path d="M16 13v6" stroke={C} strokeWidth="1.4" />
      </>,
      s
    ),
  Seed: (s) =>
    svg(
      <>
        <path d="M4 27h24" stroke={T} strokeWidth="1.6" />
        <path d="M16 27V14" stroke={T} strokeWidth="1.8" />
        <path d="M16 17c0-5 3.5-8 9-8 0 5-3.5 8-9 8z" fill={TF} stroke={T} strokeWidth="1.6" />
        <path d="M16 20c0-4-3-6.5-8-6.5 0 4 3 6.5 8 6.5z" fill={TF} stroke={T} strokeWidth="1.6" />
        <circle cx="16" cy="27" r="2" fill={C} />
      </>,
      s
    ),
  "Series A+": (s) =>
    svg(
      <>
        <path d="M16 28v-6" stroke={T} strokeWidth="1.8" />
        <path
          d="M16 4c-6 0-10 4.5-10 9.5S10 22 16 22s10-3.5 10-8.5S22 4 16 4z"
          fill={TF}
          stroke={T}
          strokeWidth="1.6"
        />
        <circle cx="12" cy="12" r="1.6" fill={C} />
        <circle cx="19" cy="9" r="1.6" fill={C} />
        <circle cx="20" cy="16" r="1.6" fill={C} />
        <path d="M10 28h12" stroke={T} strokeWidth="1.6" />
      </>,
      s
    ),
  buyer: (s) =>
    svg(
      <>
        <circle cx="16" cy="11" r="5" fill={TF} stroke={T} strokeWidth="2" />
        <path d="M6 27c1.3-5.5 5-8 10-8s8.7 2.5 10 8" stroke={T} strokeWidth="2" />
        <circle cx="24" cy="7" r="2.6" fill={C} />
      </>,
      s
    ),
  company: (s) =>
    svg(
      <>
        <rect x="5" y="9" width="10" height="18" rx="2" fill={TF} stroke={T} strokeWidth="2" />
        <rect x="17" y="5" width="10" height="22" rx="2" fill={TF} stroke={T} strokeWidth="2" />
        <circle cx="22" cy="12" r="1.6" fill={C} />
      </>,
      s
    ),
  trigger: (s) =>
    svg(<path d="M17 3L7 18h8l-2 11 12-16h-8z" fill={CF} stroke={C} strokeWidth="2" />, s),
  skip: (s) =>
    svg(
      <>
        <circle
          cx="16"
          cy="16"
          r="12"
          fill="rgba(224,36,74,.08)"
          stroke="#e0244a"
          strokeWidth="2"
        />
        <path d="M7.5 24.5l17-17" stroke="#e0244a" strokeWidth="2" />
      </>,
      s
    ),
  site: (s) =>
    svg(
      <>
        <circle cx="16" cy="16" r="12" fill={TF} stroke={T} strokeWidth="1.8" />
        <path d="M4 16h24M16 4c4 4 4 20 0 24M16 4c-4 4-4 20 0 24" stroke={T} strokeWidth="1.4" />
        <circle cx="21" cy="11" r="2.4" fill={C} />
      </>,
      s
    ),
  chat: (s) =>
    svg(
      <>
        <path d="M5 7h22v14H13l-6 5v-5H5z" fill={TF} stroke={T} strokeWidth="1.8" />
        <circle cx="12" cy="14" r="1.4" fill={T} />
        <circle cx="16" cy="14" r="1.4" fill={C} />
        <circle cx="20" cy="14" r="1.4" fill={T} />
      </>,
      s
    ),
};

/** The IcpFinder mark, small, for chat names. */
export const MiniMark = ({ size = 20 }: { size?: number }) => (
  <span className="minimark" style={{ width: size, height: size }} aria-hidden="true">
    <svg width={size * 0.7} height={size * 0.7} viewBox="0 0 64 64" aria-hidden="true">
      <path
        d="M18 14Q8 32 18 50M46 14Q56 32 46 50"
        stroke="#14B8A6"
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="32" cy="33" r="7" fill="#F26B3D" />
    </svg>
  </span>
);
