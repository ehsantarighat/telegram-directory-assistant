"use client";

import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * "All listings" back button on the listing detail page.
 *
 * Why this isn't a plain <Link href="/listings">:
 *   The /listings feed lives entirely in URL params (q, type, city,
 *   minPrice, …). A plain link to /listings drops those, so users
 *   coming from a filtered feed get dumped on an unfiltered one.
 *
 * router.back() returns to the previous history entry — typically the
 * same /listings?...filters URL the user came from — so the filter
 * state restores naturally via browser back semantics.
 *
 * If there is no usable history (deep-linked from a bookmark, opened
 * in a new tab, came from /saved or an external link), we fall back
 * to a hard navigation to /listings.
 */
export function BackToListingsButton() {
  const router = useRouter();

  const handleClick = () => {
    // history.length === 1 means this is the only entry — there's nothing
    // to back into. In all other cases, prefer browser-back so filters
    // and scroll position survive.
    if (
      typeof window !== "undefined" &&
      window.history.length > 1 &&
      document.referrer &&
      new URL(document.referrer).pathname.startsWith("/listings")
    ) {
      router.back();
      return;
    }
    router.push("/listings");
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
