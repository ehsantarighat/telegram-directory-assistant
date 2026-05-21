"use client";

import { useState } from "react";
import { BookmarkIcon, BookmarkCheckIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  listingId: string;
  initialSavedCount?: number;
  variant?: "icon" | "labeled";
  className?: string;
};

/**
 * Optimistic save/unsave toggle. Phase 4 only flips local state and shows
 * a toast — real persistence wires up in Phase 5 (Supabase Auth + a
 * /api/listings/[id]/save endpoint inside a transaction that also updates
 * `listings.saved_count`).
 */
export function SaveButton({
  listingId,
  initialSavedCount = 0,
  variant = "icon",
  className,
}: Props) {
  const [saved, setSaved] = useState(false);
  const [count, setCount] = useState(initialSavedCount);

  const handleClick = () => {
    setSaved((prev) => {
      const next = !prev;
      setCount((c) => Math.max(0, c + (next ? 1 : -1)));
      toast(next ? "Saved to your list" : "Removed from saved", {
        description: next ? "Sign in to keep saved listings across devices." : undefined,
      });
      return next;
    });
    // Phase 5 will replace this with a real POST/DELETE.
    void listingId;
  };

  const Icon = saved ? BookmarkCheckIcon : BookmarkIcon;

  if (variant === "icon") {
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={handleClick}
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
