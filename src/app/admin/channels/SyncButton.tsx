"use client";

import { useTransition } from "react";
import { RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { runSyncAction } from "@/lib/admin/ingestion-actions";
import { cn } from "@/lib/utils";

type Props = {
  channelId: string;
  disabled?: boolean;
  className?: string;
};

/**
 * Admin "Run sync" button. Scrapes the channel's public t.me/s/<username>
 * page, runs the source-agnostic ingestion pipeline, and surfaces
 * { fetched, inserted, duplicates, skipped } in a toast.
 *
 * Bounded to the last 100 posts (or 6 months, whichever is stricter).
 * Subsequent runs honour the stored last_synced_at watermark so only
 * new posts get processed.
 */
export function SyncButton({ channelId, disabled, className }: Props) {
  const [pending, startTransition] = useTransition();

  const handleClick = () => {
    const fd = new FormData();
    fd.set("channelId", channelId);
    startTransition(async () => {
      const result = await runSyncAction(fd);
      if (result.ok) {
        const { fetched, inserted, duplicates, skipped } = result.result;
        const desc =
          `Fetched ${fetched} · ` +
          `${inserted} new · ` +
          `${duplicates} duplicate${duplicates === 1 ? "" : "s"} · ` +
          `${skipped} skipped`;
        toast.success(`@${result.channelUsername} synced`, {
          description: desc,
        });
      } else {
        toast.error("Sync failed", { description: result.error });
      }
    });
  };

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={handleClick}
      disabled={pending || disabled}
      className={cn("gap-1.5", className)}
      aria-label="Sync this channel from Telegram"
    >
      <RefreshCwIcon
        className={cn("h-3.5 w-3.5", pending && "animate-spin")}
        aria-hidden
      />
      {pending ? "Syncing…" : "Run sync"}
    </Button>
  );
}
