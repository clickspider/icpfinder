// SPDX-License-Identifier: MIT
//
// Hero demo video assets. Re-encoded WhatsApp recording uploaded to
// Vercel Blob (public). To re-upload: run
// `BLOB_READ_WRITE_TOKEN=… bunx tsx scripts/upload-hero-video.ts`
// then bump VERSION below — Vercel Blob serves `cache-control: max-age=31536000`,
// so the querystring is the only safe way to force browsers off a stale cache.

const VERSION = "audio-1";
const BASE = "https://ylv7ck0fbsaqfrs5.public.blob.vercel-storage.com";

export const HERO_VIDEO_MP4 = `${BASE}/hero-demo.mp4?v=${VERSION}`;
export const HERO_VIDEO_WEBM = `${BASE}/hero-demo.webm?v=${VERSION}`;
export const HERO_VIDEO_POSTER = `${BASE}/hero-demo-poster.jpg?v=${VERSION}`;

export const HERO_VIDEO_AVAILABLE: boolean =
  HERO_VIDEO_MP4.length > 0 || HERO_VIDEO_WEBM.length > 0;
