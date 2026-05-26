// SPDX-License-Identifier: MIT

interface SocialProof {
  stars: number | null;
  weeklyDownloads: number | null;
}

async function loadSocialProof(): Promise<SocialProof> {
  const fallback: SocialProof = { stars: null, weeklyDownloads: null };
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ??
      process.env.VERCEL_PROJECT_PRODUCTION_URL ??
      process.env.VERCEL_URL;
    const url = baseUrl
      ? `${baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`}/api/social-proof`
      : null;

    if (!url) {
      const [stars, weeklyDownloads] = await Promise.all([fetchStars(), fetchDownloads()]);
      return { stars, weeklyDownloads };
    }
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return fallback;
    return (await res.json()) as SocialProof;
  } catch {
    return fallback;
  }
}

async function fetchStars(): Promise<number | null> {
  try {
    const res = await fetch("https://api.github.com/repos/clickspider/icpfinder", {
      headers: { Accept: "application/vnd.github+json" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { stargazers_count?: number };
    return typeof data.stargazers_count === "number" ? data.stargazers_count : null;
  } catch {
    return null;
  }
}

async function fetchDownloads(): Promise<number | null> {
  try {
    const res = await fetch(
      "https://api.npmjs.org/downloads/point/last-week/@icpfinder/core",
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { downloads?: number };
    return typeof data.downloads === "number" ? data.downloads : null;
  } catch {
    return null;
  }
}

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`.replace(".0k", "k");
  return String(n);
}

export async function SocialProofStrip() {
  const { stars, weeklyDownloads } = await loadSocialProof();
  const hasStars = stars !== null && stars > 0;
  const hasDownloads = weeklyDownloads !== null && weeklyDownloads > 0;

  if (!hasStars && !hasDownloads) {
    return (
      <div className="mt-10 flex flex-wrap items-center gap-4 text-[13px] text-[color:var(--text-muted)] tabular">
        <span className="inline-flex items-center gap-2">
          <span className="text-[color:var(--coral)]">●</span>
          <span>MIT</span>
        </span>
        <span aria-hidden="true">·</span>
        <a
          href="https://github.com/clickspider/icpfinder"
          className="hover:text-[color:var(--text)] transition-colors"
        >
          github.com/clickspider/icpfinder
        </a>
        <span aria-hidden="true">·</span>
        <span>v0.1</span>
      </div>
    );
  }

  return (
    <div className="mt-10 flex flex-wrap items-center gap-4 text-[13px] text-[color:var(--text-muted)] tabular">
      {hasStars ? (
        <a
          href="https://github.com/clickspider/icpfinder"
          className="inline-flex items-center gap-2 hover:text-[color:var(--text)] transition-colors"
        >
          <span className="text-[color:var(--coral)]">★</span>
          <span className="font-semibold">{formatNumber(stars as number)}</span>
          <span>stars</span>
        </a>
      ) : null}
      {hasStars && hasDownloads ? <span aria-hidden="true">·</span> : null}
      {hasDownloads ? (
        <a
          href="https://www.npmjs.com/package/@icpfinder/core"
          className="inline-flex items-center gap-2 hover:text-[color:var(--text)] transition-colors"
        >
          <span className="font-semibold">{formatNumber(weeklyDownloads as number)}</span>
          <span>weekly npm installs</span>
        </a>
      ) : null}
      <span aria-hidden="true">·</span>
      <span>MIT</span>
      <span aria-hidden="true">·</span>
      <span>v0.1</span>
    </div>
  );
}
