"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BookmarkCheckIcon, BookmarkIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  listingId: string;
  initialSaved?: boolean;
  initialSavedCount?: number;
  variant?: "icon" | "labeled";
  className?: string;
};

/**
 * Save / unsave with real persistence. Initial state comes from the
 * server (saved_listings join hydrated in the feed query / detail
 * query). Click toggles via POST/DELETE /api/listings/[id]/save which
 * runs in a transaction with the listings.saved_count update.
 *
 * Anonymous users get redirected to /login with a ?next= to come back
 * here after signing in.
 */
export function SaveButton({
  listingId,
  initialSaved = false,
  initialSavedCount = 0,
  variant = "icon",
  className,
}: Props) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [count, setCount] = useState(initialSavedCount);
  const [pending, startTransition] = useTransition();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const previousSaved = saved;
    const previousCount = count;

    // Optimistic flip
    setSaved(!previousSaved);
    setCount((c) => Math.max(0, c + (previousSaved ? -1 : 1)));

    startTransition(async () => {
      try {
        const res = await fetch(`/api/listings/${listingId}/save`, {
          method: previousSaved ? "DELETE" : "POST",
        });
        if (res.status === 401) {
          // Roll back optimistic state and bounce to /login
          setSaved(previousSaved);
          setCount(previousCount);
          const next = `/listings/${listingId}`;
          router.push(`/login?next=${encodeURIComponent(next)}`);
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as {
          saved: boolean;
          savedCount: number;
        };
        setSaved(data.saved);
        setCount(data.savedCount);
        toast(data.saved ? "Saved to your list" : "Removed from saved");
      } catch (err) {
        // Revert
        setSaved(previousSaved);
        setCount(previousCount);
        toast.error("Couldn't update saved state. Try again.");
        void err;
      }
    });
  };

  const Icon = saved ? BookmarkCheckIcon : BookmarkIcon;

  if (variant === "icon") {
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={handleClick}
        disabled={pending}
        aria-pressed={saved}
        aria-label={saved ? "Remove from saved" : "Save listing"}
        className={cn(
          "shrink-0 transition-colors",
          saved && "text-primary",
          className,
        )}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </Button>
    );
  }

  return (
    <Button
      variant={saved ? "default" : "outline"}
      size="sm"
      onClick={handleClick}
      disabled={pending}
      aria-pressed={saved}
      className={cn("gap-1.5", className)}
    >
      <Icon className="h-4 w-4" aria-hidden />
      {saved ? "Saved" : "Save"}
      {count > 0 && (
        <span className="ms-1 text-xs text-muted-foreground">· {count}</span>
      )}
    </Button>
  );
}
