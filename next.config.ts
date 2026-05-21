import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root so Turbopack doesn't pick up an unrelated
  // lockfile higher in the filesystem.
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Allow Supabase Storage and Unsplash through next/image once the UI lands.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
