"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { ListingCard } from "@/components/listings/ListingCard";
import { ListingCardSkeleton } from "@/components/states/ListingCardSkeleton";
import { Button } from "@/components/ui/button";
import type { ListingsListItem, ListingsPage } from "@/lib/listings/query";

type Props = {
  initial: ListingsPage;
  /** IDs the current viewer has saved (server-hydrated). */
  savedIds?: string[];
};

/**
 * Client wrapper around the server-rendered first page. Loads additional
 * pages via /api/listings as the sentinel intersects the viewport.
 *
 * The parent passes a fresh `key` whenever the URL filters/sort change, so
 * this component cleanly remounts with new initial state. No setState in
 * effect needed for prop synchronization.
 */
export function ListingFeedInfinite({ initial, savedIds }: Props) {
  const searchParams = useSearchParams();
  const savedSet = new Set(savedIds ?? []);
  const [items, setItems] = useState<ListingsListItem[]>(initial.items);
  const [cursor, setCursor] = useState<string | null>(initial.nextCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (!cursor || loading) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams(searchParams.toString());
      params.set("cursor", cursor);
      const res = await fetch(`/api/listings?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const page = (await res.json()) as ListingsPage;
      setItems((prev) => [...prev, ...page.items]);
      setCursor(page.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [cursor, loading, searchParams]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !cursor) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          void loadMore();
        }
      },
      { rootMargin: "200px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [cursor, loadMore]);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((listing) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            initialSaved={savedSet.has(listing.id)}
          />
        ))}
        {loading &&
          Array.from({ length: 3 }).map((_, i) => (
            <ListingCardSkeleton key={`s${i}`} />
          ))}
      </div>

      {error && (
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={loadMore}>
            Retry
          </Button>
        </div>
      )}

      {/* Sentinel for IntersectionObserver */}
      {cursor && !error && (
        <div
          ref={sentinelRef}
          className="flex justify-center py-2 text-xs text-muted-foreground"
        >
          {loading ? "Loading more…" : "Scroll for more"}
        </div>
      )}

      {!cursor && items.length > 0 && (
        <p className="py-4 text-center text-xs text-muted-foreground">
          You&apos;ve reached the end · {items.length} listing{items.length === 1 ? "" : "s"}
        </p>
      )}
    </div>
  );
}
