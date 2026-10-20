// SPDX-License-Identifier: MIT
//
// Product brand from its website: the logo (as a data URL, so the app works
// offline) and up to 3 brand colors.
// ponytail: colors come from theme-color + hex counts in the page and its first
// stylesheet; no image analysis. Add icon-pixel sampling if sites lack CSS colors.

const ICON_MAX_BYTES = 400_000;
const TIMEOUT_MS = 8_000;

export interface Brand {
  logo?: string;
  colors: string[];
}

const abs = (href: string, base: string): string | null => {
  try {
    const u = new URL(href, base);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
};

const attr = (tag: string, name: string): string | undefined =>
  tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, "i"))?.[1];

/** Icon candidates, best first: apple-touch-icon, svg/png icons, then /favicon.ico. */
export const iconCandidates = (html: string, base: string): string[] => {
  const links = html.match(/<link\b[^>]*>/gi) ?? [];
  const scored: Array<[number, string]> = [];
  for (const tag of links) {
    const rel = (attr(tag, "rel") ?? "").toLowerCase();
    const href = attr(tag, "href");
    if (!href || !rel.includes("icon")) continue;
    const url = abs(href, base);
    if (!url) continue;
    const size = Number(attr(tag, "sizes")?.split("x")[0] ?? 0);
    const score =
      (rel.includes("apple-touch") ? 1000 : 0) + (/\.svg(\?|$)/i.test(url) ? 500 : 0) + size;
    scored.push([score, url]);
  }
  scored.sort((a, b) => b[0] - a[0]);
  const fav = abs("/favicon.ico", base);
  return [...new Set([...scored.map(([, u]) => u), ...(fav ? [fav] : [])])];
};

const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.length === 4 ? hex.replace(/[0-9a-f]/gi, "$&$&").slice(1) : hex.slice(1);
  return [0, 2, 4].map((i) => Number.parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
};

/** Saturation-ish and lightness, 0..1. */
const sl = (hex: string): [number, number] => {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const s = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
  return [s, l];
};

const hue = (hex: string): number => {
  const [r, g, b] = hexToRgb(hex);
  return (
    Math.round((Math.atan2(Math.sqrt(3) * (g - b), 2 * r - g - b) * 180) / Math.PI + 360) % 360
  );
};

/** Brand colors from CSS/HTML text: frequent, saturated, not near white/black, distinct hues. */
export const pickColors = (text: string, themeColor?: string): string[] => {
  const counts = new Map<string, number>();
  for (const m of text.matchAll(/#([0-9a-f]{6}|[0-9a-f]{3})\b/gi)) {
    let hex = `#${m[1]?.toLowerCase()}`;
    if (hex.length === 4) hex = `#${hex.slice(1).replace(/./g, "$&$&")}`;
    counts.set(hex, (counts.get(hex) ?? 0) + 1);
  }
  const usable = (h: string) => {
    const [s, l] = sl(h);
    return s > 0.35 && l > 0.2 && l < 0.8;
  };
  const ranked = [...counts.entries()].filter(([h]) => usable(h)).sort((a, b) => b[1] - a[1]);
  const out: string[] = [];
  const theme = themeColor?.toLowerCase();
  if (theme && /^#[0-9a-f]{6}$/.test(theme) && usable(theme)) out.push(theme);
  for (const [h] of ranked) {
    if (out.length >= 3) break;
    if (out.every((o) => Math.min(Math.abs(hue(o) - hue(h)), 360 - Math.abs(hue(o) - hue(h))) > 25))
      out.push(h);
  }
  return out;
};

const timed = (url: string): Promise<Response> =>
  fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), redirect: "follow" });

const fetchIcon = async (url: string): Promise<string | undefined> => {
  try {
    const res = await timed(url);
    const type = (res.headers.get("content-type") ?? "").split(";")[0]?.trim() ?? "";
    if (!res.ok || !type.startsWith("image/")) return undefined;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > ICON_MAX_BYTES) return undefined;
    return `data:${type};base64,${buf.toString("base64")}`;
  } catch {
    return undefined;
  }
};

export const readBrand = async (html: string, base: string): Promise<Brand> => {
  let logo: string | undefined;
  for (const url of iconCandidates(html, base).slice(0, 4)) {
    logo = await fetchIcon(url);
    if (logo) break;
  }
  const theme = (html.match(/<meta\b[^>]*name=["']theme-color["'][^>]*>/i) ?? [])[0];
  const sheetTag = (html.match(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi) ?? [])[0];
  const sheetUrl = sheetTag ? abs(attr(sheetTag, "href") ?? "", base) : null;
  let css = "";
  if (sheetUrl) {
    try {
      css = (await (await timed(sheetUrl)).text()).slice(0, 2_000_000);
    } catch {
      // Colors from the HTML alone, then.
    }
  }
  return { logo, colors: pickColors(html + css, theme ? attr(theme, "content") : undefined) };
};
