import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  listings,
  savedListings,
  telegramChannels,
  listingSources,
} from "@/db/schema";
import type { ListingsListItem } from "@/lib/listings/query";

/**
 * Has the user saved a given listing?
 */
export async function isListingSaved(
  userId: string,
  listingId: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: savedListings.id })
    .from(savedListings)
    .where(
      and(
        eq(savedListings.userId, userId),
        eq(savedListings.listingId, listingId),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

/**
 * Which of the given listing IDs has the user saved? Returns a Set for
 * O(1) lookup. Used by the listings feed to hydrate the initial saved
 * state on each card without N round-trips.
 */
export async function getSavedListingIds(
  userId: string,
  listingIds: string[],
): Promise<Set<string>> {
  if (listingIds.length === 0) return new Set();
  const rows = await db
    .select({ listingId: savedListings.listingId })
    .from(savedListings)
    .where(
      and(
        eq(savedListings.userId, userId),
        inArray(savedListings.listingId, listingIds),
      ),
    );
  return new Set(rows.map((r) => r.listingId));
}

/**
 * The /saved page feed. Returns the user's saved listings ordered by
 * saved_at desc, in the same shape as the public feed so we can reuse
 * ListingCard.
 */
export async function fetchSavedListings(
  userId: string,
): Promise<ListingsListItem[]> {
  const rows = await db
    .select({
      id: listings.id,
      title: listings.title,
      summary: listings.summary,
      listingType: listings.listingType,
      propertyType: listings.propertyType,
      price: listings.price,
      currency: listings.currency,
      city: listings.city,
      district: listings.district,
      neighborhood: listings.neighborhood,
      rooms: listings.rooms,
      areaSqm: listings.areaSqm,
      floor: listings.floor,
      totalFloors: listings.totalFloors,
      furnished: listings.furnished,
      hasPhotos: listings.hasPhotos,
      mainImageUrl: listings.mainImageUrl,
      mediaUrls: listings.mediaUrls,
      sourceCount: listings.sourceCount,
      savedCount: listings.savedCount,
      viewCount: listings.viewCount,
      publishedAt: listings.publishedAt,
      savedAt: savedListings.createdAt,
    })
    .from(savedListings)
    .innerJoin(listings, eq(listings.id, savedListings.listingId))
    .where(eq(savedListings.userId, userId))
    .orderBy(desc(savedListings.createdAt));

  // Hydrate primary channel for each saved listing
  const ids = rows.map((r) => r.id);
  const channelMap = new Map<string, ListingsListItem["primaryChannel"]>();
  if (ids.length > 0) {
    const sources = await db
      .select({
        listingId: listingSources.listingId,
        channelId: telegramChannels.id,
        username: telegramChannels.username,
        title: telegramChannels.title,
        publishedAt: listingSources.publishedAt,
      })
      .from(listingSources)
      .innerJoin(
        telegramChannels,
        eq(telegramChannels.id, listingSources.telegramChannelId),
      )
      .where(inArray(listingSources.listingId, ids))
      .orderBy(listingSources.publishedAt);
    for (const s of sources) {
      if (!channelMap.has(s.listingId)) {
        channelMap.set(s.listingId, {
          id: s.channelId,
          username: s.username,
          title: s.title,
        });
      }
    }
  }

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    summary: r.summary,
    listingType: r.listingType,
    propertyType: r.propertyType,
    price: r.price,
    currency: r.currency,
    city: r.city,
    district: r.district,
    neighborhood: r.neighborhood,
    rooms: r.rooms,
    areaSqm: r.areaSqm,
    floor: r.floor,
    totalFloors: r.totalFloors,
    furnished: r.furnished,
    hasPhotos: r.hasPhotos,
    mainImageUrl: r.mainImageUrl,
    mediaUrls: r.mediaUrls,
    sourceCount: r.sourceCount,
    savedCount: r.savedCount,
    viewCount: r.viewCount,
    publishedAt: r.publishedAt?.toISOString() ?? null,
    primaryChannel: channelMap.get(r.id) ?? null,
  }));
}

/**
 * Save a listing for a user. Wraps INSERT into saved_listings and the
 * `listings.saved_count + 1` UPDATE in a single transaction so the
 * denormalized count stays consistent.
 *
 * No-op (returns false) if the row already exists.
 */
export async function saveListing(
  userId: string,
  listingId: string,
): Promise<{ saved: boolean; savedCount: number }> {
  return await db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: savedListings.id })
      .from(savedListings)
      .where(
        and(
          eq(savedListings.userId, userId),
          eq(savedListings.listingId, listingId),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      const [row] = await tx
        .select({ count: listings.savedCount })
        .from(listings)
        .where(eq(listings.id, listingId))
        .limit(1);
      return { saved: false, savedCount: row?.count ?? 0 };
    }

    await tx.insert(savedListings).values({ userId, listingId });
    const [updated] = await tx
      .update(listings)
      .set({ savedCount: sql`${listings.savedCount} + 1` })
      .where(eq(listings.id, listingId))
      .returning({ count: listings.savedCount });

    return { saved: true, savedCount: updated?.count ?? 1 };
  });
}

/**
 * Inverse of saveListing: removes the row and decrements saved_count in
 * a single transaction. saved_count is clamped at 0 to defend against
 * any drift.
 */
export async function unsaveListing(
  userId: string,
  listingId: string,
): Promise<{ saved: boolean; savedCount: number }> {
  return await db.transaction(async (tx) => {
    const deleted = await tx
      .delete(savedListings)
      .where(
        and(
          eq(savedListings.userId, userId),
          eq(savedListings.listingId, listingId),
        ),
      )
      .returning({ id: savedListings.id });

    if (deleted.length === 0) {
      const [row] = await tx
        .select({ count: listings.savedCount })
        .from(listings)
        .where(eq(listings.id, listingId))
        .limit(1);
      return { saved: false, savedCount: row?.count ?? 0 };
    }

    const [updated] = await tx
      .update(listings)
      .set({
        savedCount: sql`GREATEST(${listings.savedCount} - 1, 0)`,
      })
      .where(eq(listings.id, listingId))
      .returning({ count: listings.savedCount });

    return { saved: false, savedCount: updated?.count ?? 0 };
  });
}
