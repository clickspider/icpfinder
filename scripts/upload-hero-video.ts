// SPDX-License-Identifier: MIT
//
// One-off: upload the hero demo video assets to Vercel Blob and print the
// resulting public URLs. Paste them into packages/web/lib/hero-video.ts.
//
// Prereqs:
//   - ffmpeg-encoded files at /tmp/icpfinder-video/{hero-demo.mp4,
//     hero-demo.webm, hero-demo-poster.jpg}
//   - BLOB_READ_WRITE_TOKEN env var (Vercel CLI auto-injects after
//     `vercel blob create-store --access public icpfinder-hero-final`).
//
// Usage (from repo root):
//   set -a && source .env.local && set +a
//   bunx tsx scripts/upload-hero-video.ts

import { readFileSync } from "node:fs";
import { put } from "@vercel/blob";

const FILES = [
  { name: "hero-demo.mp4", type: "video/mp4" },
  { name: "hero-demo.webm", type: "video/webm" },
  { name: "hero-demo-poster.jpg", type: "image/jpeg" },
] as const;

async function main(): Promise<void> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("BLOB_READ_WRITE_TOKEN not set. Source .env.local first.");
    process.exit(1);
  }
  const results: Array<{ name: string; url: string }> = [];
  for (const { name, type } of FILES) {
    const buf = readFileSync(`/tmp/icpfinder-video/${name}`);
    const blob = await put(name, buf, {
      access: "public",
      addRandomSuffix: false,
      contentType: type,
      allowOverwrite: true,
    });
    results.push({ name, url: blob.url });
    console.log(`uploaded ${name} → ${blob.url}`);
  }
  console.log("\nPaste into packages/web/lib/hero-video.ts:");
  const map = Object.fromEntries(results.map((r) => [r.name, r.url]));
  console.log(`export const HERO_VIDEO_MP4 = "${map["hero-demo.mp4"]}";`);
  console.log(`export const HERO_VIDEO_WEBM = "${map["hero-demo.webm"]}";`);
  console.log(`export const HERO_VIDEO_POSTER = "${map["hero-demo-poster.jpg"]}";`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
