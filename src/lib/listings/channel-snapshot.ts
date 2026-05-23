import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { listingSources, listings, telegramChannels } from "@/db/schema";

export type ChannelSnapshot = {
  username: string;
  title: string;
  url: string;
  /** Distinct active listings where this channel appears as a source. */
  activeListingsCount: number;
  lastSyncedAt: Date | null;
};

/**
 * Compact channel summary for the listing-detail aside "From this
 * channel" card. Two cheap queries in parallel:
 *   - one row from telegram_channels (title, url, last_synced_at)
 *   - aggregate count of distinct active listings via listing_sources
 *
 * Returns null if the channel doesn't exist or has been removed —
 * the caller can drop the card entirely in that case.
 */
export async function fetchChannelSnapshot(
  username: string,
): Promise<ChannelSnapshot | null> {
  const [channelRow, countRow] = await Promise.all([
    db
      .select({
        username: telegramChannels.username,
        title: telegramChannels.title,
        url: telegramChannels.url,
        lastSyncedAt: telegramChannels.lastSyncedAt,
        id: telegramChannels.id,
        status: telegramChannels.status,
      })
      .from(telegramChannels)
      .where(eq(telegramChannels.username, username))
      .limit(1)
      .then((rows) => rows[0] ?? null),

    // Count via a subquery so we can do it before knowing the
    // channel id — the subquery resolves it in-place.
    db
      .select({
        n: sql<number>`count(distinct ${listingSources.listingId})::int`,
      })
      .from(listingSources)
      .innerJoin(listings, eq(listings.id, listingSources.listingId))
      .innerJoin(
        telegramChannels,
        eq(telegramChannels.id, listingSources.telegramChannelId),
      )
      .where(
        and(
          eq(telegramChannels.username, username),
          eq(listings.status, "active"),
        ),
      )
      .then((rows) => rows[0]?.n ?? 0),
  ]);

  if (!channelRow || channelRow.status !== "active") return null;

  return {
    username: channelRow.username,
    title: channelRow.title,
    url: channelRow.url,
    activeListingsCount: countRow,
    lastSyncedAt: channelRow.lastSyncedAt,
  };
}
