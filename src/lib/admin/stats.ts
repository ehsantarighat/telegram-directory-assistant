import { desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  channelSuggestions,
  listingSources,
  listings,
  rawTelegramPosts,
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
    /** Distinct active listings where this channel is a source. */
    listingCount: number;
    /** Distinct Telegram posts (raw_telegram_posts) for this channel. */
    postsCount: number;
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
    // Public-feed-correct listings count: only listings whose primary
    // source channel is still active. This matches what visitors see
    // on /listings — listings from removed channels stay in the DB for
    // attribution but no longer appear on the public feed (filter is
    // applied in fetchListings) so we shouldn't count them here either.
    db
      .select({
        total: sql<number>`count(distinct ${listings.id})::int`,
        active: sql<number>`count(distinct ${listings.id}) filter (where ${listings.status} = 'active' and ${telegramChannels.status} = 'active')::int`,
      })
      .from(listings)
      .leftJoin(
        listingSources,
        eq(listingSources.listingId, listings.id),
      )
      .leftJoin(
        telegramChannels,
        eq(telegramChannels.id, listingSources.telegramChannelId),
      )
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
    // Most-active channels picked by the REAL post count (raw_telegram_posts)
    // not the stored accumulator. The accumulator drifts: every sync added
    // `inserted + duplicates` to the field, so re-syncs and resurrect flows
    // could over- or under-count. The raw_telegram_posts table is the
    // source of truth — one row per Telegram message (unique on
    // channel_id + message_id), so this number is impossible to inflate.
    db
      .select({
        id: telegramChannels.id,
        username: telegramChannels.username,
        title: telegramChannels.title,
        postsCount: sql<number>`count(distinct ${rawTelegramPosts.id})::int`,
      })
      .from(telegramChannels)
      .leftJoin(
        rawTelegramPosts,
        eq(rawTelegramPosts.telegramChannelId, telegramChannels.id),
      )
      .where(eq(telegramChannels.status, "active"))
      .groupBy(
        telegramChannels.id,
        telegramChannels.username,
        telegramChannels.title,
      )
      .orderBy(sql`count(distinct ${rawTelegramPosts.id}) desc`)
      .limit(5),
  ]);

  // Per-channel listing counts via listing_sources, batched in one query.
  // Counts distinct active listings where this channel is one of the sources.
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
      postsCount: c.postsCount,
      listingCount: listingCountsByChannel.get(c.id) ?? 0,
    })),
  };
}
