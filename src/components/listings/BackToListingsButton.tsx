"use client";

import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

import { readLastListingsUrl } from "./ListingsUrlMemory";

/**
 * "All listings" back button on the listing detail page.
 *
 * The /listings feed lives entirely in URL params (q, type, city,
 * minPrice, …). A plain <Link href="/listings"> drops those, so
 * users coming from a filtered feed get dumped on an unfiltered one.
 *
 * Strategy:
 *   1) Read the last-visited /listings URL from sessionStorage
 *      (written by ListingsUrlMemory while the user is on /listings).
 *      Restores the user's exact filter state regardless of how
 *      they got to the detail page.
 *   2) If sessionStorage is empty (first visit, private mode, etc.),
 *      navigate to bare /listings.
 *
 * Browser back/forward continues to work naturally — this button is
 * the in-app "up" affordance that the design renders at the top of
 * every detail page.
 */
export function BackToListingsButton() {
  const router = useRouter();

  const handleClick = () => {
    const saved = readLastListingsUrl();
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
