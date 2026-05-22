import Link from "next/link";
import { BookmarkIcon, GitMergeIcon, MapPinIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { formatPrice, priceSuffix } from "@/lib/format/price";
import { formatRelative } from "@/lib/format/date";
import { formatLocation, formatRoomsAreaFloor } from "@/lib/format/listing";
import { cn } from "@/lib/utils";
import type { ListingsListItem } from "@/lib/listings/query";

import { ListingThumb } from "./ListingThumb";
import { ListingTypeBadge } from "./ListingTypeBadge";
import { SaveButton } from "./SaveButton";
import { ShareButton } from "./ShareButton";

type Props = {
  listing: ListingsListItem;
  /** Whether the current viewer has saved this listing (hydrated server-side) */
  initialSaved?: boolean;
  /** Show wider variant on /saved or listing detail */
  variant?: "default" | "compact";
  className?: string;
};

export function ListingCard({
  listing,
  initialSaved = false,
  variant = "default",
  className,
}: Props) {
  const href = `/listings/${listing.id}`;
  const location = formatLocation({
    city: listing.city,
    district: listing.district,
    neighborhood: listing.neighborhood,
  });
  const roomsLine = formatRoomsAreaFloor(listing);
  const priceLabel = formatPrice(listing.price, listing.currency, {
    suffix: priceSuffix(listing.listingType),
  });

  return (
    <Card
      className={cn(
        "group relative overflow-hidden p-0 transition-shadow hover:shadow-md",
        className,
      )}
    >
      <Link
        href={href}
        prefetch={false}
        aria-label={listing.title}
        className="absolute inset-0 z-10"
      >
        <span className="sr-only">View listing</span>
      </Link>

      <div className="relative">
        <div className="relative">
          <ListingThumb src={listing.mainImageUrl} alt={listing.title} />

          <div className="absolute start-3 top-3 flex items-center gap-1.5">
            <ListingTypeBadge type={listing.listingType} />
            {listing.sourceCount > 1 && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-black/65 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm"
                title={`Posted in ${listing.sourceCount} channels`}
              >
                <GitMergeIcon className="h-3 w-3" aria-hidden />
                {listing.sourceCount} sources
              </span>
            )}
          </div>

          <div className="absolute end-3 top-3 z-20 flex gap-1">
            <SaveButton
              listingId={listing.id}
              initialSaved={initialSaved}
              initialSavedCount={listing.savedCount}
              variant="icon"
              className="bg-background/80 backdrop-blur"
            />
            <ShareButton
              url={href}
              title={listing.title}
              variant="icon"
              className="bg-background/80 backdrop-blur"
            />
          </div>
        </div>
      </div>

      <div className={cn("flex flex-col gap-2 p-4", variant === "compact" && "p-3 gap-1.5")}>
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-lg font-semibold leading-tight tracking-tight">
            {priceLabel}
          </p>
          {listing.savedCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <BookmarkIcon className="h-3 w-3" aria-hidden />
              {listing.savedCount}
            </span>
          )}
        </div>

        <h3 className="line-clamp-2 text-sm font-medium text-foreground">
          {listing.title}
        </h3>

        {(location || roomsLine) && (
          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
            {location && (
              <span className="inline-flex items-center gap-1">
                <MapPinIcon className="h-3 w-3" aria-hidden />
                <span className="truncate">{location}</span>
              </span>
            )}
            {roomsLine && <span className="truncate">{roomsLine}</span>}
          </div>
        )}

        <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="truncate">
            {listing.primaryChannel ? (
              <>
                via{" "}
                <span className="font-medium text-foreground">
                  @{listing.primaryChannel.username}
                </span>
              </>
            ) : (
              "Direct listing"
            )}
          </span>
          {listing.publishedAt && (
            <span>{formatRelative(listing.publishedAt)}</span>
          )}
        </div>
      </div>
    </Card>
  );
}
