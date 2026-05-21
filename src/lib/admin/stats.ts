import { desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  channelSuggestions,
  listingSources,
  listings,
  removalRequests,
  savedListings,
  telegramChannels,
  userProfiles,
} from "@/db/schema";

export type AdminOverviewStats = {
  users: number;
  activeChannels: number;
  listings: number;
  activeListings: number;
  savedListings: number;
  pendingSuggestions: number;
  openRemovalRequests: number;
  mostSavedListings: Array<{
    id: string;
    title: string;
    city: string | null;
    listingType: "rent" | "sale" | "daily_rent";
    savedCount: number;
  }>;
  mostActiveChannels: Array<{
    id: string;
    username: string;
    title: string;
    listingCount: number;
    postsImportedCount: number;
  }>;
};

/**
 * One round-trip of counts + top-N rows for the admin dashboard.
 * We run the cheap aggregates in parallel; PG can plan them all
 * concurrently on the pooler.
 */
export async function fetchOverviewStats(): Promise<AdminOverviewStats> {
  const [
    usersCount,
    activeChannelsCount,
    listingsCounts,
    savedListingsCount,
    pendingSuggestionsCount,
    openRemovalsCount,
    mostSavedListings,
    mostActiveChannels,
  ] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(userProfiles)
      .then((r) => r[0]?.n ?? 0),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(telegramChannels)
      .where(eq(telegramChannels.status, "active"))
      .then((r) => r[0]?.n ?? 0),
    db
      .select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where ${listings.status} = 'active')::int`,
      })
      .from(listings)
      .then((r) => r[0] ?? { total: 0, active: 0 }),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(savedListings)
      .then((r) => r[0]?.n ?? 0),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(channelSuggestions)
      .where(eq(channelSuggestions.status, "pending"))
      .then((r) => r[0]?.n ?? 0),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(removalRequests)
      .where(eq(removalRequests.status, "pending"))
      .then((r) => r[0]?.n ?? 0),
    db
      .select({
        id: listings.id,
        title: listings.title,
        city: listings.city,
        listingType: listings.listingType,
        savedCount: listings.savedCount,
      })
      .from(listings)
      .where(eq(listings.status, "active"))
      .orderBy(desc(listings.savedCount), desc(listings.publishedAt))
      .limit(5),
    db
      .select({
        id: telegramChannels.id,
        username: telegramChannels.username,
        title: telegramChannels.title,
        postsImportedCount: telegramChannels.postsImportedCount,
      })
      .from(telegramChannels)
      .where(eq(telegramChannels.status, "active"))
      .orderBy(desc(telegramChannels.postsImportedCount))
      .limit(5),
  ]);

  // Per-channel active-listing counts via listing_sources, batched in one query
  const topChannelIds = mostActiveChannels.map((c) => c.id);
  const listingCountsByChannel = new Map<string, number>();
  if (topChannelIds.length > 0) {
    const rows = await db
      .select({
        channelId: listingSources.telegramChannelId,
        n: sql<number>`count(distinct ${listingSources.listingId})::int`,
      })
      .from(listingSources)
      .innerJoin(listings, eq(listings.id, listingSources.listingId))
      .where(
        inArray(listingSources.telegramChannelId, topChannelIds),
      )
      .groupBy(listingSources.telegramChannelId);
    for (const r of rows) listingCountsByChannel.set(r.channelId, r.n);
  }

  return {
    users: usersCount,
    activeChannels: activeChannelsCount,
    listings: listingsCounts.total,
    activeListings: listingsCounts.active,
    savedListings: savedListingsCount,
    pendingSuggestions: pendingSuggestionsCount,
    openRemovalRequests: openRemovalsCount,
    mostSavedListings: mostSavedListings.map((r) => ({
      id: r.id,
      title: r.title,
      city: r.city,
      listingType: r.listingType,
      savedCount: r.savedCount,
    })),
    mostActiveChannels: mostActiveChannels.map((c) => ({
      id: c.id,
      username: c.username,
      title: c.title,
      postsImportedCount: c.postsImportedCount,
      listingCount: listingCountsByChannel.get(c.id) ?? 0,
    })),
  };
}
