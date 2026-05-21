"use client";

import { FlagIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  listingId: string;
  variant?: "icon" | "labeled";
  className?: string;
};

/**
 * Placeholder report button. Phase 9 wires this up to a removal_requests
 * form (modal sheet) and persists to the queue admins review.
 */
export function ReportButton({ listingId, variant = "labeled", className }: Props) {
  const handleClick = () => {
    toast("Report flow coming in Phase 9", {
      description: "Removal request submission will be available soon.",
    });
    void listingId;
  };

  if (variant === "icon") {
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={handleClick}
        aria-label="Report this listing"
        className={cn("shrink-0 text-muted-foreground", className)}
      >
        <FlagIcon className="h-4 w-4" aria-hidden />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      className={cn(
        "gap-1.5 text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      <FlagIcon className="h-4 w-4" aria-hidden />
      Report
    </Button>
  );
}
