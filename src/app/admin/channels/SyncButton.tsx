"use client";

import { useTransition } from "react";
import { RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { runMockSyncAction } from "@/lib/admin/ingestion-actions";
import { cn } from "@/lib/utils";

type Props = {
  channelId: string;
  disabled?: boolean;
  className?: string;
};

/**
 * Admin "Run sync" button. Invokes the mock ingestion pipeline for one
 * channel and surfaces { fetched, inserted, duplicates, skipped } in a
 * toast. Disabled when the channel is disabled / removed.
 *
 * Phase 10 always calls the mock source. When the real Telethon worker
 * ships, we'll either swap the source inside runMockSyncAction or add
 * a separate "Run real sync" entry point.
 */
export function SyncButton({ channelId, disabled, className }: Props) {
  const [pending, startTransition] = useTransition();

  const handleClick = () => {
    const fd = new FormData();
    fd.set("channelId", channelId);
    startTransition(async () => {
      const result = await runMockSyncAction(fd);
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
      aria-label="Run mock sync for this channel"
    >
      <RefreshCwIcon
        className={cn("h-3.5 w-3.5", pending && "animate-spin")}
        aria-hidden
      />
      {pending ? "Syncing…" : "Run sync"}
    </Button>
  );
}
