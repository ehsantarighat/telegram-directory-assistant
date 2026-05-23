"use client";

import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

import { readLastListingsUrl } from "./ListingsUrlMemory";

/**
 * "All listings" back button on the listing detail page.
 *
 * Two goals to preserve simultaneously:
 *   1. Filter state — the /listings feed is fully URL-driven, so
 *      a plain push to "/listings" drops whatever filters the
 *      user had set.
 *   2. Scroll position + loaded-pages state — the infinite-scroll
 *      feed only keeps its items + scroll if we re-use the cached
 *      React tree. `router.push()` is a NEW navigation; Next.js
 *      remounts the page, resets scroll to top, and drops the
 *      loaded pages. `router.back()` traverses history; Next.js'
 *      built-in scroll restoration + RSC cache restore both.
 *
 * Strategy:
 *   - If we have a usable previous history entry AND
 *     ListingsUrlMemory has saved a /listings URL (meaning the
 *     user was on /listings before reaching this detail page),
 *     use router.back(). Browser-back behaviour preserves scroll
 *     position and loaded items for free.
 *   - Otherwise (deep link, new tab, came from /saved, etc.) fall
 *     back to a hard push to the last-known /listings URL.
 *     Filter state survives via sessionStorage; scroll resets to
 *     top, which is unavoidable without history state to restore.
 */
export function BackToListingsButton() {
  const router = useRouter();

  const handleClick = () => {
    if (typeof window === "undefined") return;
    const saved = readLastListingsUrl();
    // history.length > 1 means there's at least one prior entry to
    // back into. Combined with a saved /listings URL, this strongly
    // suggests the user got here from /listings via client nav.
    if (saved && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(saved ?? "/listings");
  };

  return (
    <Button
      type="button"
      onClick={handleClick}
      variant="ghost"
      size="sm"
      className="mb-4 gap-1"
    >
      <ArrowLeftIcon className="h-4 w-4" />
      All listings
    </Button>
  );
}
