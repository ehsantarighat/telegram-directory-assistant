import Link from "next/link";
import { ExternalLinkIcon, RadioIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatRelative } from "@/lib/format/date";
import type { ChannelSnapshot } from "@/lib/listings/channel-snapshot";

/**
 * "From this channel" card in the listing-detail aside. Tells the
 * visitor how active the source channel is and gives them a one-
 * click way to browse everything else that channel has posted.
 *
 * Used as a cross-check signal: a listing from a channel with 50
 * active listings and a recent sync is a different trust profile
 * than a listing from a one-off channel last synced weeks ago.
 */
type Props = {
  snapshot: ChannelSnapshot;
};

export function ListingChannelSnapshot({ snapshot }: Props) {
  const listingsHref = `/listings?channelUsername=${encodeURIComponent(
    snapshot.username,
  )}`;

  return (
    <Card className="p-4 md:p-5">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        From this channel
      </h3>

      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <RadioIcon className="h-4 w-4" aria-hidden />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Link
            href={snapshot.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-semibold hover:underline min-w-0 break-words"
          >
            {snapshot.title}
            <ExternalLinkIcon className="h-3 w-3 shrink-0" aria-hidden />
          </Link>
          <span className="break-all text-xs text-muted-foreground">
            @{snapshot.username}
          </span>
        </div>
      </div>

      <dl className="mt-4 flex flex-col gap-1.5 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">Active listings</dt>
          <dd className="font-medium tabular-nums">
            {snapshot.activeListingsCount.toLocaleString()}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">Last synced</dt>
          <dd className="font-medium">
            {snapshot.lastSyncedAt
              ? formatRelative(snapshot.lastSyncedAt)
              : "never"}
          </dd>
        </div>
      </dl>

      {snapshot.activeListingsCount > 0 && (
        <Button
          render={<Link href={listingsHref} />}
          variant="secondary"
          size="sm"
          className="mt-4 w-full"
        >
          Browse all {snapshot.activeListingsCount.toLocaleString()}{" "}
          {snapshot.activeListingsCount === 1 ? "listing" : "listings"}
        </Button>
      )}
    </Card>
  );
}
