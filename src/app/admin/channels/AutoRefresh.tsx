"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCwIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  /** Polling interval in seconds. */
  intervalSec?: number;
  className?: string;
};

/**
 * Tiny client-side auto-refresh for the admin channels page.
 *
 * The page itself is a server component with `dynamic = "force-dynamic"`,
 * so router.refresh() re-runs the server data fetch (no stale-from-cache
 * concern) and re-renders the table with the latest lastSyncedAt /
 * lastSyncError values from the DB.
 *
 * Why this is necessary: the cron worker (Railway service `worthy-radiance`)
 * silently updates the DB every 10 min, but without a refresh the admin
 * keeps staring at the cache of whatever was rendered when they first
 * loaded the page. Now they see the sync activity in real-ish time
 * without having to F5.
 *
 * Visible "last refreshed Xs ago" + a manual button so the admin knows
 * the page IS alive and can force an immediate refresh if they want.
 */
export function AutoRefresh({
  intervalSec = 30,
  className,
}: Props) {
  const router = useRouter();
  // Stored in state so React's strict purity rule isn't tripped by
  // calling Date.now() during render. Both timestamps update via
  // effects, and the derived secsSince is computed from state only.
  const [lastRefreshed, setLastRefreshed] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());

  // Auto refresh
  useEffect(() => {
    const id = setInterval(() => {
      router.refresh();
      const t = Date.now();
      setLastRefreshed(t);
      setNow(t);
    }, intervalSec * 1000);
    return () => clearInterval(id);
  }, [router, intervalSec]);

  // Tick once per second so "Xs ago" advances without a refresh
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const secsSince = Math.max(0, Math.floor((now - lastRefreshed) / 1000));
  const display =
    secsSince < 5 ? "just now" : secsSince < 60 ? `${secsSince}s ago` : "1m+ ago";

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-xs text-muted-foreground",
        className,
      )}
    >
      <span>Auto-refreshes every {intervalSec}s · last: {display}</span>
      <button
        type="button"
        onClick={() => {
          router.refresh();
          const t = Date.now();
          setLastRefreshed(t);
          setNow(t);
        }}
        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-[11px] hover:bg-muted"
        title="Refresh now"
      >
        <RefreshCwIcon className="h-3 w-3" aria-hidden />
        Refresh now
      </button>
    </div>
  );
}
