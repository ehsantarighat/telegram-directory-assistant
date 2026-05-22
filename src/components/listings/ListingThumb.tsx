"use client";

import { useState } from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";

type Props = {
  src: string | null | undefined;
  alt: string;
  /** Tailwind aspect ratio class. Default 4/3 for grid thumbnails. */
  aspect?: string;
  className?: string;
  /** Whether to crop (cover) or letterbox (contain). Default cover. */
  fit?: "cover" | "contain";
  /** Set to true to mark first card LCP image. */
  priority?: boolean;
};

/**
 * Listing thumbnail with two graceful-degrade paths:
 *   1. No src provided → render the local SVG placeholder
 *   2. src provided but next/image fails (broken URL, video URL, expired
 *      Telegram CDN signature, etc.) → swap to the placeholder on the
 *      Image's onError callback
 *
 * Both paths render the same visual so the grid layout stays consistent.
 *
 * Aspect ratio is enforced on the wrapper, not the image, so the card
 * height is identical regardless of whether a photo loaded or not — no
 * layout shift when a broken image swaps to placeholder mid-render.
 *
 * `fit="cover"` (default) crops to fill the box — best for grid views.
 * `fit="contain"` letterboxes inside the box — best for detail galleries
 * where the user wants to see the whole image, including portrait 9:16
 * photos.
 */
export function ListingThumb({
  src,
  alt,
  aspect = "aspect-[4/3]",
  className,
  fit = "cover",
  priority = false,
}: Props) {
  const [broken, setBroken] = useState(false);
  const useFallback = !src || broken;

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-muted",
        aspect,
        className,
      )}
    >
      {useFallback ? (
        // Local SVG. Using next/image so it benefits from caching and
        // doesn't need a third-party host on the remotePatterns allowlist.
        <Image
          src="/listing-placeholder.svg"
          alt={alt}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover"
          priority={priority}
        />
      ) : (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          quality={80}
          className={cn(
            "transition-transform duration-300",
            fit === "cover" ? "object-cover group-hover:scale-[1.02]" : "object-contain",
          )}
          priority={priority}
          onError={() => setBroken(true)}
        />
      )}
    </div>
  );
}
