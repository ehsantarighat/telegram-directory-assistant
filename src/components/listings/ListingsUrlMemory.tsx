"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

const STORAGE_KEY = "tda:lastListingsUrl";

/**
 * Persists the active /listings URL (path + filters) to sessionStorage
 * so the listing-detail "All listings" back button can return the user
 * to the exact filter state they were viewing.
 *
 * Why sessionStorage and not history.back() / document.referrer:
 *   - Next.js client-side navigation often leaves document.referrer
 *     empty, so a referrer-based heuristic falls through to bare
 *     /listings.
 *   - history.back() depends on the back stack containing the right
 *     entry. If the user refreshed, opened the listing in a new tab,
 *     or arrived via deep link, there's no back entry to restore.
 *   - sessionStorage survives client-side nav within the same tab and
 *     dies with the tab, which is the right scope: filter memory
 *     belongs to this browsing session.
 *
 * Mounted as a sibling of the feed on /listings; runs only on the
 * client.
 */
export function ListingsUrlMemory() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const search = searchParams?.toString() ?? "";
    const url = `/listings${search ? `?${search}` : ""}`;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, url);
    } catch {
      // Storage can throw in private mode or when quota is exceeded —
      // filter memory is a nice-to-have, never block the page on it.
    }
  }, [searchParams]);

  return null;
}

/**
 * Read the last stored /listings URL. Returns null when nothing is
 * saved, sessionStorage is unavailable, or the stored value isn't a
 * /listings path (defensive against tampering).
 */
export function readLastListingsUrl(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.sessionStorage.getItem(STORAGE_KEY);
    if (!value) return null;
    if (!value.startsWith("/listings")) return null;
    return value;
  } catch {
    return null;
  }
}
