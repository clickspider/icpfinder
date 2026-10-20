// SPDX-License-Identifier: MIT
//
// Small shared pieces: the living stage, ICP art, proof helpers.

import type { AccountResearch, Finding, FindingKind } from "@icpfinder/core";
import { type CSSProperties, type ReactNode, useEffect, useState } from "react";
import type { IcpApi } from "../../shared/types";
import claudeLogo from "./assets/claude.png";
import codexLogo from "./assets/codex.png";
import gmailLogo from "./assets/gmail.png";
import hnLogo from "./assets/hn.png";
import hunterLogo from "./assets/hunter.png";
import instagramLogo from "./assets/instagram.png";
import linkedinLogo from "./assets/linkedin.png";
import redditLogo from "./assets/reddit.png";
import xLogo from "./assets/x.png";

/** Tool logos ship with the app, so they show at once (no network). */
export const TOOL_LOGOS: Record<string, string> = {
  claude: claudeLogo,
  codex: codexLogo,
  hunter: hunterLogo,
  gmail: gmailLogo,
  linkedin: linkedinLogo,
  instagram: instagramLogo,
  hn: hnLogo,
  reddit: redditLogo,
  x: xLogo,
};

const logoKey = (name: string) =>
  name
    .toLowerCase()
    .replace(/ code$/, "")
    .replace(/\.io$/, "")
    .replace(/\s+/g, "");

export const ToolLogo = ({
  name,
  size,
  radius,
}: {
  name: string;
  size: number;
  radius: number;
}) => (
  <img
    src={TOOL_LOGOS[logoKey(name)]}
    alt=""
    width={size}
    height={size}
    style={{
      width: size,
      height: size,
      borderRadius: radius,
      objectFit: "cover",
      background: "#fff",
      boxShadow: "0 0 0 0.5px rgba(0,0,0,0.12)",
      flexShrink: 0,
    }}
  />
);

declare global {
  interface Window {
    icp: IcpApi;
  }
}
export const api = (): IcpApi => window.icp;

/** One palette per ICP: [stage base, blob A, blob B, launcher art]. */
const PALETTES: Array<[string, string, string, string]> = [
  [
    "#ffe3ea",
    "#ff3d63",
    "#ff8a5c",
    "repeating-linear-gradient(135deg,#ff2d55 0 6px,#ffffff 6px 12px)",
  ],
  ["#f1e6ff", "#bf5af2", "#ff7aa2", "linear-gradient(135deg,#bf5af2,#ff7aa2)"],
  ["#fff0e0", "#ff9f0a", "#ff5e3a", "linear-gradient(135deg,#ff9f0a,#ff2d55)"],
  ["#e3f3ff", "#2f8cff", "#5ad1ff", "linear-gradient(135deg,#2f8cff,#5ad1ff)"],
  ["#e6f7ec", "#30d158", "#30b0c7", "linear-gradient(135deg,#30b0c7,#30d158)"],
];
export const palette = (i: number) =>
  PALETTES[i % PALETTES.length] as [string, string, string, string];
export const artStyle = (i: number, size = 44, radius = 12): CSSProperties => ({
  width: size,
  height: size,
  borderRadius: radius,
  flexShrink: 0,
  background: palette(i)[3],
});

export const Stage = ({
  art = 0,
  colors,
  style,
  children,
}: {
  art?: number;
  /** Product brand colors; override the ICP palette when given. */
  colors?: string[];
  style?: CSSProperties;
  children?: ReactNode;
}) => {
  const [base, a, b] = brandStage(colors) ?? palette(art);
  return (
    <div className="stage" style={{ background: base, ...style }}>
      <div className="blob b1" style={{ background: a }} aria-hidden="true" />
      <div className="blob b2" style={{ background: b }} aria-hidden="true" />
      <div className="blob b4" style={{ background: a, opacity: 0.6 }} aria-hidden="true" />
      <div className="blob b3" aria-hidden="true" />
      <div className="blob b5" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />
      <div style={{ position: "relative", height: "100%" }}>{children}</div>
    </div>
  );
};

/** The IcpFinder logo: two teal brackets around a coral dot, on the brand cream. */
export const Mark = ({ size = 20, radius = 7 }: { size?: number; radius?: number }) => (
  <div
    aria-hidden="true"
    style={{
      width: size,
      height: size,
      borderRadius: radius,
      flexShrink: 0,
      background: "#F7F5F0",
      boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,0.08)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <svg width={size * 0.78} height={size * 0.78} viewBox="0 0 64 64" aria-hidden="true">
      <path
        d="M 18 14 Q 8 32 18 50"
        stroke="#14B8A6"
        strokeWidth={size <= 24 ? 6 : 5}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M 46 14 Q 56 32 46 50"
        stroke="#14B8A6"
        strokeWidth={size <= 24 ? 6 : 5}
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="32" cy="33" r={size <= 24 ? 6.2 : 7} fill="#F26B3D" />
    </svg>
  </div>
);

export const Spinner = () => <div className="spinner" role="status" aria-label="Working" />;

export const proven = (r?: AccountResearch) =>
  r?.findings.filter((f) => f.status === "proven") ?? [];
export const weak = (r?: AccountResearch) => r?.findings.filter((f) => f.status === "weak") ?? [];

/** Best finding of a kind: proven first, then weak. */
export const best = (r: AccountResearch | undefined, kind: FindingKind): Finding | undefined =>
  r?.findings.find((f) => f.kind === kind && f.status === "proven") ??
  r?.findings.find((f) => f.kind === kind && f.status === "weak");

export const ProofPill = ({ f }: { f?: Finding }) => {
  if (!f) return <span className="pill p-gray">none found</span>;
  if (f.status === "proven") return <span className="pill p-green">proven</span>;
  if (f.status === "weak") return <span className="pill p-amber">1 source</span>;
  return <span className="pill p-red">rejected</span>;
};

export const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

export const initial = (name: string) => (name.trim()[0] ?? "?").toUpperCase();

/** Mix a hex color with white. t = 0 keeps it, t = 1 is white. */
const tint = (hex: string, t: number): string => {
  const n = Number.parseInt(hex.slice(1), 16);
  const ch = [n >> 16, (n >> 8) & 255, n & 255].map((c) => Math.round(c + (255 - c) * t));
  return `#${ch.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
};

/** The product's own palette for the stage, or IcpFinder's when the site had none. */
export const brandStage = (colors?: string[]): [string, string, string] | undefined => {
  const a = colors?.[0];
  if (!a) return undefined;
  return [tint(a, 0.86), a, colors?.[1] ?? tint(a, 0.35)];
};

export const brandTint = (colors?: string[], t = 0.88) =>
  colors?.[0] ? tint(colors[0], t) : "#fff0f3";
/** Brand color dark enough to read as an icon on its own light tint. */
export const brandInk = (colors?: string[]) => {
  const c = colors?.[0];
  if (!c) return "#e0244a";
  const n = Number.parseInt(c.slice(1), 16);
  const rgb = [n >> 16, (n >> 8) & 255, n & 255];
  const light = (Math.max(...rgb) + Math.min(...rgb)) / 510 > 0.5;
  return light
    ? `#${rgb
        .map((v) =>
          Math.round(v * 0.62)
            .toString(16)
            .padStart(2, "0")
        )
        .join("")}`
    : c;
};

export const ProductLogo = ({
  product,
  size = 36,
  radius = 10,
}: {
  product: { name: string; logo?: string; colors?: string[] };
  size?: number;
  radius?: number;
}) =>
  product.logo ? (
    <img
      src={product.logo}
      alt=""
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        objectFit: "contain",
        background: "#fff",
        boxShadow: "0 0 0 0.5px rgba(0,0,0,0.12)",
        flexShrink: 0,
      }}
    />
  ) : (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: product.colors?.[0] ?? "#111114",
        color: "#fff",
        fontWeight: 700,
        fontSize: size * 0.42,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {(product.name[0] ?? "?").toUpperCase()}
    </div>
  );

const ICON_PATHS: Record<string, string> = {
  sell: "M3 11.5V4a1 1 0 011-1h7.5L21 12.5 12.5 21z M7.5 7.5h.01",
  problem:
    "M12 3a9 9 0 100 18 9 9 0 000-18z M12 7a5 5 0 100 10 5 5 0 000-10z M12 11a1 1 0 100 2 1 1 0 000-2z",
  different:
    "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z",
  price:
    "M12 3a9 9 0 100 18 9 9 0 000-18z M14.5 9.5a2.5 2 0 00-2.5-1.5c-1.4 0-2.5.8-2.5 2s1.1 1.6 2.5 2 2.5.8 2.5 2-1.1 2-2.5 2a2.5 2 0 01-2.5-1.5 M12 6.5v11",
};

export const SectionIcon = ({
  kind,
  colors,
}: {
  kind: keyof typeof ICON_PATHS | string;
  colors?: string[];
}) => (
  <div
    aria-hidden="true"
    style={{
      width: 32,
      height: 32,
      borderRadius: 9,
      background: brandTint(colors),
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    }}
  >
    <svg
      aria-hidden="true"
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke={brandInk(colors)}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={ICON_PATHS[kind] ?? ICON_PATHS.sell} />
    </svg>
  </div>
);

/** One product fact as a clear card: icon, label, editable text. */
export const FactField = ({
  kind,
  label,
  value,
  colors,
  onSave,
}: {
  kind: string;
  label: string;
  value: string;
  colors?: string[];
  onSave: (v: string) => void;
}) => (
  <label
    style={{
      display: "flex",
      gap: 12,
      padding: 12,
      borderRadius: 14,
      background: "#fff",
      boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,0.12)",
      alignItems: "flex-start",
    }}
  >
    <SectionIcon kind={kind} colors={colors} />
    <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
      <span className="lbl">{label}</span>
      <textarea
        className="area fact-area"
        defaultValue={value}
        onBlur={(e) => e.target.value !== value && onSave(e.target.value)}
      />
    </span>
  </label>
);

const ICP_ICONS: Array<[RegExp, string]> = [
  [
    /develop|engineer|technical|\bcto\b|\bcode\b|devrel/i,
    "M8 8l-4 4 4 4 M16 8l4 4-4 4 M13.5 5l-3 14",
  ],
  [
    /portfolio|accelerat|venture|investor|\bvc\b|studio|fund/i,
    "M12 21v-8 M12 13c0-4 3-7 7-7 0 4-3 7-7 7z M12 15c0-3-2.5-5.5-6-5.5 0 3.5 2.5 6 6 5.5z",
  ],
  [/sales|gtm|revenue|growth|business dev/i, "M3 17l6-6 4 4 8-8 M15 7h6v6"],
  [/market|brand|content|community/i, "M4 10v4h3l6 4V6L7 10z M17 9a4 4 0 010 6"],
  [
    /agency|consult|freelanc/i,
    "M9 11a3 3 0 100-6 3 3 0 000 6z M3 20a6 6 0 0112 0 M17 11a3 3 0 100-6 M21 20a6 6 0 00-4-5.7",
  ],
  [/product|\bpm\b/i, "M12 3l8 4.5v9L12 21l-8-4.5v-9z M12 12l8-4.5 M12 12v9 M12 12L4 7.5"],
  [/design|ux|ui\b/i, "M4 20l4-1 11-11-3-3L5 16z M14 6l3 3"],
  [
    /recruit|talent|hr\b|people/i,
    "M4 5h16v14H4z M9 12a2 2 0 100-4 2 2 0 000 4z M6 16a3 3 0 016 0 M14 9h4 M14 13h4",
  ],
  [
    /founder|ceo|owner|maker|solo/i,
    "M12 3c3 2 5 6 5 10l-2 3H9l-2-3c0-4 2-8 5-10z M12 9a1.5 1.5 0 100 3 1.5 1.5 0 000-3z M9 16l-2 4 M15 16l2 4",
  ],
];
const ICP_DEFAULT =
  "M12 3a9 9 0 100 18 9 9 0 000-18z M12 7a5 5 0 100 10 5 5 0 000-10z M12 11a1 1 0 100 2 1 1 0 000-2z";

const ART_GRADIENTS = [
  "linear-gradient(135deg,#ff2d55,#ff7a3d)",
  "linear-gradient(135deg,#bf5af2,#ff7aa2)",
  "linear-gradient(135deg,#ff9f0a,#ff2d55)",
  "linear-gradient(135deg,#2f8cff,#5ad1ff)",
  "linear-gradient(135deg,#30b0c7,#30d158)",
];

/** ICP tile: its color plus an icon picked from the role (founder, sales, developer…). */
export const IcpArt = ({
  icp,
  size = 44,
  radius = 12,
}: {
  icp: { art: number; name: string; industry: string };
  size?: number;
  radius?: number;
}) => {
  const path =
    ICP_ICONS.find(([re]) => re.test(icp.name))?.[1] ??
    ICP_ICONS.find(([re]) => re.test(icp.industry))?.[1] ??
    ICP_DEFAULT;
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        flexShrink: 0,
        background: ART_GRADIENTS[icp.art % ART_GRADIENTS.length],
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.4)",
      }}
    >
      <svg
        aria-hidden="true"
        width={size * 0.5}
        height={size * 0.5}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#fff"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={path} />
      </svg>
    </div>
  );
};

export const MODELS: Array<{ id: string; name: string; version: string; hint: string }> = [
  { id: "claude-sonnet-5-5", name: "Sonnet", version: "5.5", hint: "Balanced · default" },
  { id: "claude-opus-5-5", name: "Opus", version: "5.5", hint: "Deepest · slower" },
  { id: "claude-haiku-5-5", name: "Haiku", version: "5.5", hint: "Fastest · lightest" },
];

/** Claude's logo plus the exact model and version it runs on; a glass menu to switch. */
export const ModelPicker = ({
  value,
  onChange,
  size = 16,
}: {
  value: string;
  onChange: (id: string) => void;
  size?: number;
}) => {
  const [open, setOpen] = useState(false);
  const cur = MODELS.find((m) => m.id === value) ?? MODELS[0];
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [open]);
  return (
    <span className="mp">
      <button
        type="button"
        className="mp-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
      >
        <ToolLogo name="claude" size={size} radius={4} />
        {cur?.name} <span className="mp-ver">{cur?.version}</span>
        <svg
          width="9"
          height="9"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="mp-menu glass pop" role="menu">
          {MODELS.map((m) => (
            <button
              key={m.id}
              type="button"
              role="menuitemradio"
              aria-checked={m.id === cur?.id}
              className={`mp-item ${m.id === cur?.id ? "on" : ""}`}
              onClick={() => {
                onChange(m.id);
                setOpen(false);
              }}
            >
              <ToolLogo name="claude" size={22} radius={6} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="mp-name">
                  Claude {m.name} <span className="mp-ver">{m.version}</span>
                </span>
                <span className="mp-hint">{m.hint}</span>
              </span>
              {m.id === cur?.id && <span className="mp-check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </span>
  );
};

/** "Snap" state: something came back empty or failed. An icon, two short lines, one way out. */
export const Snap = ({
  kind,
  title,
  text,
  cta,
  onCta,
  busy,
}: {
  kind: "empty" | "error" | "start";
  title: string;
  text?: string;
  cta?: string;
  onCta?: () => void;
  busy?: boolean;
}) => (
  <div className="snap rise" role={kind === "error" ? "alert" : "status"}>
    <svg
      width="44"
      height="44"
      viewBox="0 0 32 32"
      fill="none"
      strokeLinecap="round"
      aria-hidden="true"
    >
      {kind === "error" ? (
        <>
          <circle
            cx="16"
            cy="16"
            r="12"
            fill="rgba(224,36,74,.08)"
            stroke="#e0244a"
            strokeWidth="1.8"
          />
          <path d="M16 10v7M16 21.5v.5" stroke="#e0244a" strokeWidth="2.2" />
        </>
      ) : (
        <>
          <circle
            cx="14"
            cy="14"
            r="8.5"
            fill="rgba(20,184,166,.14)"
            stroke="#0f9384"
            strokeWidth="1.8"
          />
          <path d="M20.5 20.5L27 27" stroke="#0f9384" strokeWidth="2.4" />
          {kind === "empty" ? (
            <path d="M11 15.5q3-2.5 6 0" stroke="#F26B3D" strokeWidth="1.8" />
          ) : (
            <circle cx="14" cy="14" r="2.6" fill="#F26B3D" />
          )}
        </>
      )}
    </svg>
    <div className="snap-title">{title}</div>
    {text && <div className="snap-text">{text}</div>}
    {cta && onCta && (
      <button type="button" className="ob-cta" disabled={busy} onClick={onCta}>
        {busy ? "Working…" : cta}
      </button>
    )}
  </div>
);

/** Turn raw errors into one short line a founder understands. */
export const friendly = (msg: string): string => {
  const m = msg.replace(/^Error invoking remote method '\w+': (Error: )?/, "");
  if (/log ?in|not authenticated|unauthorized/i.test(m))
    return "Sign in to Claude Code first, then try again.";
  if (/timed out/i.test(m)) return "Claude took too long. Try again.";
  if (/claude -p exited|claude CLI/i.test(m)) return "Claude did not answer. Try again.";
  if (/fetch failed|ENOTFOUND|ECONNRESET|network/i.test(m))
    return "No connection to the web. Check your internet.";
  if (/JSON|Unexpected token/i.test(m)) return "Claude's answer came back broken. Try again.";
  return m.slice(0, 140);
};

export const cleanError = (e: unknown): string =>
  friendly(e instanceof Error ? e.message : String(e));
