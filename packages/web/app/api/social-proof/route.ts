// SPDX-License-Identifier: MIT

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 3600;

interface SocialProof {
  stars: number | null;
  weeklyDownloads: number | null;
  fetchedAt: string;
}

const GITHUB_REPO = "clickspider/icpfinder";
const NPM_PACKAGE = "@icpfinder/core";

async function fetchStars(): Promise<number | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}`, {
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
      `https://api.npmjs.org/downloads/point/last-week/${encodeURIComponent(NPM_PACKAGE)}`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { downloads?: number };
    return typeof data.downloads === "number" ? data.downloads : null;
  } catch {
    return null;
  }
}

export async function GET(): Promise<NextResponse<SocialProof>> {
  const [stars, weeklyDownloads] = await Promise.all([fetchStars(), fetchDownloads()]);
  const payload: SocialProof = {
    stars,
    weeklyDownloads,
    fetchedAt: new Date().toISOString(),
  };
  return NextResponse.json(payload, {
    headers: {
      "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
