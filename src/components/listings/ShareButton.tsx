"use client";

import { Share2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  url: string;
  title: string;
  text?: string;
  variant?: "icon" | "labeled";
  className?: string;
};

/**
 * Uses the Web Share API when available (iOS / Android Chrome), otherwise
 * falls back to copying the URL to the clipboard with a toast confirmation.
 */
export function ShareButton({
  url,
  title,
  text,
  variant = "icon",
  className,
}: Props) {
  const handleClick = async () => {
    const absoluteUrl = url.startsWith("http")
      ? url
      : typeof window !== "undefined"
        ? new URL(url, window.location.href).toString()
        : url;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url: absoluteUrl });
        return;
      } catch (err) {
        // Most likely user cancellation. Don't toast on abort.
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(absoluteUrl);
      toast("Link copied", { description: absoluteUrl });
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  if (variant === "icon") {
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={handleClick}
        aria-label="Share listing"
        className={cn("shrink-0", className)}
      >
        <Share2Icon className="h-4 w-4" aria-hidden />
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      className={cn("gap-1.5", className)}
    >
      <Share2Icon className="h-4 w-4" aria-hidden />
      Share
    </Button>
  );
}
