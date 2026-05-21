import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeftIcon,
  BookmarkIcon,
  ExternalLinkIcon,
  GitMergeIcon,
  MapPinIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ListingContactCard } from "@/components/listings/ListingContactCard";
import { ListingFactsGrid } from "@/components/listings/ListingFactsGrid";
import { ListingMediaGallery } from "@/components/listings/ListingMediaGallery";
import { ListingSourcesPanel } from "@/components/listings/ListingSourcesPanel";
import { ListingTypeBadge } from "@/components/listings/ListingTypeBadge";
import { ReportButton } from "@/components/listings/ReportButton";
import { SaveButton } from "@/components/listings/SaveButton";
import { ShareButton } from "@/components/listings/ShareButton";
import { TranslationToggle } from "@/components/listings/TranslationToggle";
import { formatRelative } from "@/lib/format/date";
import { formatLocation, propertyTypeLabel } from "@/lib/format/listing";
import { formatPrice, priceSuffix } from "@/lib/format/price";
import { fetchListingById } from "@/lib/listings/query";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const listing = await fetchListingById(id).catch(() => null);
  if (!listing) return { title: "Listing not found" };
  return {
    title: listing.title,
    description: listing.summary ?? undefined,
  };
}

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Validate UUID shape — short-circuit to 404 if it doesn't look like one
  if (!/^[0-9a-fA-F-]{32,36}$/.test(id)) notFound();

  const listing = await fetchListingById(id);
  if (!listing) notFound();

  const price = formatPrice(listing.price, listing.currency, {
    suffix: priceSuffix(listing.listingType),
  });
  const location = formatLocation({
    city: listing.city,
    district: listing.district,
    neighborhood: listing.neighborhood,
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-5 md:px-8 md:py-8">
      {/* Back link */}
      <Button
        render={<Link href="/listings" />}
        variant="ghost"
        size="sm"
        className="mb-4 gap-1"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        All listings
      </Button>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* Left column: media + facts + original text */}
        <div className="flex flex-col gap-5">
          <ListingMediaGallery
            images={listing.mediaUrls}
            alt={listing.title}
          />

          {/* Header card */}
          <Card className="p-4 md:p-5">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <ListingTypeBadge type={listing.listingType} />
                {listing.propertyType && (
                  <Badge variant="secondary" className="rounded-full">
                    {propertyTypeLabel[listing.propertyType]}
                  </Badge>
                )}
                {listing.sourceCount > 1 && (
                  <Badge
                    variant="secondary"
                    className="gap-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
                  >
                    <GitMergeIcon className="h-3 w-3" aria-hidden />
                    Posted in {listing.sourceCount} channels
                  </Badge>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-semibold leading-tight tracking-tight md:text-3xl">
                  {listing.title}
                </h1>
                {location && (
                  <p className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPinIcon className="h-4 w-4" aria-hidden />
                    {location}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <p className="text-3xl font-semibold text-primary">{price}</p>
                <div className="flex flex-wrap items-center gap-2">
                  {listing.savedCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <BookmarkIcon className="h-3 w-3" aria-hidden />
                      Saved by {listing.savedCount}
                    </span>
                  )}
                  {listing.publishedAt && (
                    <span className="text-xs text-muted-foreground">
                      · posted {formatRelative(listing.publishedAt)}
                    </span>
                  )}
                </div>
              </div>
              <div className="-mx-1 mt-1 flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
                <SaveButton
                  listingId={listing.id}
                  initialSavedCount={listing.savedCount}
                  variant="labeled"
                />
                <ShareButton
                  url={`/listings/${listing.id}`}
                  title={listing.title}
                  variant="labeled"
                />
                <ReportButton listingId={listing.id} variant="labeled" />
                <TranslationToggle
                  listingId={listing.id}
                  className="ms-auto"
                />
              </div>
            </div>
          </Card>

          <ListingFactsGrid listing={listing} />

          {listing.originalText && (
            <Card className="p-4 md:p-5">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Original post
                {listing.detectedLanguage && (
                  <span className="ms-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-normal uppercase text-muted-foreground">
                    {listing.detectedLanguage}
                  </span>
                )}
              </h3>
              <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                {listing.originalText}
              </p>
            </Card>
          )}
        </div>

        {/* Right column: sources + contact + meta */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
          <ListingSourcesPanel
            primary={listing.primarySource}
            additional={listing.additionalSources}
          />
          <ListingContactCard
            contactPhone={listing.contactPhone}
            contactTelegram={listing.contactTelegram}
          />
          <Card className="p-4 text-xs text-muted-foreground">
            <p>
              We index publicly-posted Telegram listings. We are not the
              owner or agent — always verify directly with the source
              before transferring money.
            </p>
            {listing.primarySource && (
              <Button
                render={
                  <a
                    href={listing.primarySource.originalPostUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
                variant="link"
                size="sm"
                className="px-0"
              >
                <ExternalLinkIcon className="h-3 w-3" aria-hidden />
                Open original on Telegram
              </Button>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
