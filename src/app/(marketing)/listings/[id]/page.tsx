import { notFound } from "next/navigation";
import { after } from "next/server";
import {
  BookmarkIcon,
  ExternalLinkIcon,
  EyeIcon,
  GitMergeIcon,
  MapPinIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BackToListingsButton } from "@/components/listings/BackToListingsButton";
import { ListingContactCard } from "@/components/listings/ListingContactCard";
import { LocationMap } from "@/components/listings/LocationMap";
import { ListingFactsGrid } from "@/components/listings/ListingFactsGrid";
import { AdSlot } from "@/components/ads/AdSlot";
import { ListingActivity } from "@/components/listings/ListingActivity";
import { ListingCard } from "@/components/listings/ListingCard";
import { ListingChannelSnapshot } from "@/components/listings/ListingChannelSnapshot";
import { ListingFullDetails } from "@/components/listings/ListingFullDetails";
import { ListingMediaGallery } from "@/components/listings/ListingMediaGallery";
import { ListingSourcesPanel } from "@/components/listings/ListingSourcesPanel";
import { ListingTypeBadge } from "@/components/listings/ListingTypeBadge";
import { ReportDialog } from "@/components/listings/ReportDialog";
import { SaveButton } from "@/components/listings/SaveButton";
import { ShareButton } from "@/components/listings/ShareButton";
import { TranslationBadge } from "@/components/listings/TranslationBadge";
import { TranslationToggle } from "@/components/listings/TranslationToggle";
import { formatRelative } from "@/lib/format/date";
import { formatLocation, propertyTypeLabel } from "@/lib/format/listing";
import { formatPrice, priceSuffix } from "@/lib/format/price";
import { getProfile } from "@/lib/auth/getProfile";
import { getUser } from "@/lib/auth/getUser";
import { fetchChannelSnapshot } from "@/lib/listings/channel-snapshot";
import { fetchListingById } from "@/lib/listings/query";
import { fetchRecommendations } from "@/lib/listings/recommendations";
import { getSavedListingIds, isListingSaved } from "@/lib/listings/saved";
import { bumpViewCount } from "@/lib/listings/views";
import { translateListing } from "@/lib/translation";
import type { TargetLanguage } from "@/lib/translation/types";

export const dynamic = "force-dynamic";

const SUPPORTED_LANGS = new Set<TargetLanguage>(["en", "ru", "fa"]);

function parseLang(input: unknown): TargetLanguage | null {
  if (typeof input !== "string") return null;
  return SUPPORTED_LANGS.has(input as TargetLanguage)
    ? (input as TargetLanguage)
    : null;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const [{ id }, { lang }] = await Promise.all([params, searchParams]);
  const listing = await fetchListingById(id).catch(() => null);
  if (!listing) return { title: "Listing not found" };

  let displayTitle = listing.title;
  let displaySummary = listing.summary ?? undefined;
  const target = parseLang(lang);
  if (target) {
    const t = await translateListing({ listingId: listing.id, language: target });
    if (t?.title) displayTitle = t.title;
    if (t?.summary) displaySummary = t.summary;
  }
  return { title: displayTitle, description: displaySummary };
}

export default async function ListingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const [{ id }, { lang }] = await Promise.all([params, searchParams]);

  if (!/^[0-9a-fA-F-]{32,36}$/.test(id)) notFound();

  const [listing, user] = await Promise.all([
    fetchListingById(id),
    getUser(),
  ]);
  if (!listing) notFound();

  // Bump the view counter after the response is sent — never block the
  // user-facing render on the write. Status-guarded inside bumpViewCount.
  after(() => bumpViewCount(listing.id));

  const [initialSaved, profile, recommendations, channelSnapshot] =
    await Promise.all([
      user ? isListingSaved(user.id, listing.id) : Promise.resolve(false),
      user ? getProfile(user.id) : Promise.resolve(null),
      fetchRecommendations(listing, 6),
      listing.primarySource
        ? fetchChannelSnapshot(listing.primarySource.channelUsername)
        : Promise.resolve(null),
    ]);

  // Hydrate which recommendations the current user has already saved
  // so each card's save icon renders correctly on first paint. Single
  // round-trip to listings_saved keyed on the recommendation ids.
  const recommendationIds = recommendations.map((r) => r.id);
  const savedRecommendationIds = user
    ? await getSavedListingIds(user.id, recommendationIds)
    : new Set<string>();

  // Resolve the active language:
  //   1. ?lang= in the URL (explicit)
  //   2. If absent AND user has preferredContentMode='translated' AND
  //      preferred_language is a supported target AND the listing is in
  //      a different language → use that
  //   3. Otherwise show original (lang=null)
  let activeLang: TargetLanguage | null = parseLang(lang);
  if (!activeLang && profile?.preferredContentMode === "translated") {
    const pref = profile.preferredLanguage;
    if (
      (pref === "en" || pref === "ru" || pref === "fa") &&
      listing.detectedLanguage !== pref
    ) {
      activeLang = pref;
    }
  }

  const translation = activeLang
    ? await translateListing({
        listingId: listing.id,
        language: activeLang,
      })
    : null;

  const displayTitle = translation?.title ?? listing.title;
  const displayOriginalText =
    translation?.text ?? listing.originalText;
  const displayDirection = translation?.direction ?? "ltr";
  const isTranslated = !!translation;

  const price = formatPrice(listing.price, listing.currency, {
    suffix: priceSuffix(listing.listingType),
  });
  const location = formatLocation({
    city: listing.city,
    district: listing.district,
    neighborhood: listing.neighborhood,
  });

  return (
    // `overflow-x-hidden` is a final guardrail against any descendant that
    // still pushes wider than the viewport (long URLs, unbreakable hashtags
    // in post text, etc.). `min-w-0` on grid children lets them shrink
    // below their intrinsic content width, which is required for text and
    // images to wrap/scale inside a constrained column.
    <div className="mx-auto w-full max-w-6xl overflow-x-hidden px-4 py-5 md:px-8 md:py-8">
      <BackToListingsButton />

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="flex min-w-0 flex-col gap-5">
          <ListingMediaGallery
            images={listing.mediaUrls}
            alt={listing.title}
          />

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

              {isTranslated && activeLang && (
                <TranslationBadge
                  language={activeLang}
                  provider={translation!.provider}
                  originalHref={`/listings/${listing.id}`}
                />
              )}

              <div
                className="flex flex-col gap-1"
                dir={displayDirection}
                lang={activeLang ?? undefined}
              >
                <h1 className="text-2xl font-semibold leading-tight tracking-tight md:text-3xl">
                  {displayTitle}
                </h1>
                {location && (
                  <p
                    className="inline-flex items-center gap-1 text-sm text-muted-foreground"
                    dir="ltr"
                  >
                    <MapPinIcon className="h-4 w-4" aria-hidden />
                    {location}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <p
                  className="text-2xl font-semibold text-primary md:text-3xl break-words"
                  dir="ltr"
                >
                  {price}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground"
                    title={`${listing.viewCount.toLocaleString()} ${listing.viewCount === 1 ? "view" : "views"}`}
                  >
                    <EyeIcon className="h-3 w-3" aria-hidden />
                    {listing.viewCount.toLocaleString()}{" "}
                    {listing.viewCount === 1 ? "view" : "views"}
                  </span>
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
                  <span className="text-xs text-muted-foreground">
                    · imported {formatRelative(listing.importedAt)}
                  </span>
                </div>
              </div>

              <div className="-mx-1 mt-1 flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
                <SaveButton
                  listingId={listing.id}
                  initialSaved={initialSaved}
                  initialSavedCount={listing.savedCount}
                  variant="labeled"
                />
                <ShareButton
                  url={`/listings/${listing.id}`}
                  title={listing.title}
                  variant="labeled"
                />
                <ReportDialog
                  listingId={listing.id}
                  channelId={listing.primarySource?.channelId ?? null}
                  defaultName={profile?.name ?? null}
                  defaultEmail={user?.email ?? null}
                  variant="labeled"
                />
                <TranslationToggle
                  defaultLanguage={activeLang ?? "original"}
                  className="ms-auto"
                />
              </div>
            </div>
          </Card>

          <ListingFactsGrid listing={listing} />

          <LocationMap
            city={listing.city}
            district={listing.district}
            neighborhood={listing.neighborhood}
            country={listing.country}
          />

          {displayOriginalText && (
            <Card className="p-4 md:p-5">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {isTranslated ? "Translated post" : "Original post"}
                {isTranslated ? (
                  <span className="ms-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-normal uppercase text-muted-foreground">
                    {activeLang}
                  </span>
                ) : (
                  listing.detectedLanguage && (
                    <span className="ms-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-normal uppercase text-muted-foreground">
                      {listing.detectedLanguage}
                    </span>
                  )
                )}
              </h3>
              <p
                className="whitespace-pre-line break-words text-sm leading-relaxed text-foreground"
                dir={displayDirection}
                lang={activeLang ?? listing.detectedLanguage ?? undefined}
              >
                {displayOriginalText}
              </p>
            </Card>
          )}

          {recommendations.length > 0 && (
            <section
              aria-labelledby="similar-listings-heading"
              className="flex flex-col gap-3"
            >
              <div className="flex flex-col gap-0.5">
                <h2
                  id="similar-listings-heading"
                  className="text-lg font-semibold tracking-tight"
                >
                  Similar listings
                </h2>
                <p className="text-xs text-muted-foreground">
                  Other {listing.listingType === "sale" ? "sales" : "rentals"}{" "}
                  in {listing.city}
                  {listing.district ? ` · ${listing.district}` : ""}
                  {listing.price && listing.currency
                    ? ` · around ${listing.currency} ${Number(listing.price).toLocaleString()}`
                    : ""}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {recommendations.map((r) => (
                  <ListingCard
                    key={r.id}
                    listing={r}
                    initialSaved={savedRecommendationIds.has(r.id)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        {/*
          aside is no longer sticky: with the new data cards it can be
          taller than a laptop viewport, and sticky would just pin the
          top half while the rest stayed below the fold. Letting it
          scroll naturally with the main column reads better and shows
          the visitor every card.
        */}
        <aside className="flex min-w-0 flex-col gap-4">
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

          {/* New data-dense cards filling the previously-empty aside
              space on desktop. Each renders null when it has nothing
              useful to show, so sparse listings see a shorter column
              rather than empty boxes. */}
          <ListingFullDetails listing={listing} />
          <ListingActivity listing={listing} />
          {channelSnapshot && (
            <ListingChannelSnapshot snapshot={channelSnapshot} />
          )}
          {/* Ad slot at the bottom of the aside. Skipped for admins
              (annoying for the operator). The AdSlot picker chooses
              Yandex first, falls back to Google AdSense, renders
              nothing when neither network is configured. */}
          {profile?.role !== "admin" && <AdSlot slot="detail" />}
        </aside>
      </div>
    </div>
  );
}
