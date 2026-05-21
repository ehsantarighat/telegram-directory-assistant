import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root so Turbopack doesn't pick up an unrelated
  // lockfile higher in the filesystem.
  turbopack: {
    root: path.resolve(__dirname),
  },
  // next/image remote hosts.
  //   *.supabase.co        — future Supabase Storage usage
  //   images.unsplash.com  — historical seed data
  //   *.telesco.pe         — Telegram's public CDN. Photos scraped from
  //                          t.me/s/<channel> are served from cdn1-5.telesco.pe.
  //                          We hot-link them rather than re-hosting; the URLs
  //                          are stable for the lifetime of the Telegram post.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.telesco.pe" },
    ],
  },
};

export default nextConfig;
