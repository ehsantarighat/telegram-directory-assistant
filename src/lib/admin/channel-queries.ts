import { desc, eq, ne, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  categories,
  listingSources,
  listings,
  rawTelegramPosts,
  telegramChannels,
  type TelegramChannel,
} from "@/db/schema";

export type AdminChannel = TelegramChannel & {
  categoryName: string | null;
  /** Real Telegram-post count from raw_telegram_posts (not the drifting accumulator on the channel row). */
  rawPostsCount: number;
  /** Distinct active listings where this channel is a source. */
  listingsCount: number;
};

/**
 * A sync whose `updatedAt` hasn't advanced in this many minutes is
 * considered stalled. The heartbeat in the pipeline updates updatedAt
 * every 5 posts, so 5 minutes without movement means the process was
 * killed (container restart, deploy, OOM) — not just slow.
 */
const STALE_SYNC_MINUTES = 5;

/**
 * Channels visible in /admin/channels. By default hides 'removed'
 * channels — that status is the admin's way of saying "I'm done with
 * this channel"; surfacing them in the main list defeats the action.
 * The rows still exist in the DB so listings stay attributed and
 * removal is reversible via direct SQL if ever needed.
 *
 * `disabled` channels DO stay visible — admins need to see them to
 * re-enable.
 */
export async function fetchAdminChannels(opts: {
  includeRemoved?: boolean;
} = {}): Promise<AdminChannel[]> {
  const rows = await db
    .select({
      channel: telegramChannels,
      categoryName: categories.name,
    })
    .from(telegramChannels)
    .leftJoin(categories, eq(categories.id, telegramChannels.categoryId))
    .where(
      opts.includeRemoved ? undefined : ne(telegramChannels.status, "removed"),
    )
    .orderBy(desc(telegramChannels.createdAt));

  if (rows.length === 0) return [];

  // Batch two aggregate queries: raw posts per channel, and distinct
  // active listings per channel via listing_sources. Avoids the stored
  // posts_imported_count accumulator which can drift across re-syncs
  // and the resurrect flow.
  const channelIds = rows.map((r) => r.channel.id);
  const [postsRows, listingRows] = await Promise.all([
    db
      .select({
        channelId: rawTelegramPosts.telegramChannelId,
        n: sql<number>`count(*)::int`,
      })
      .from(rawTelegramPosts)
      .where(
        sql`${rawTelegramPosts.telegramChannelId} = any(${channelIds}::uuid[])`,
      )
      .groupBy(rawTelegramPosts.telegramChannelId),
    db
      .select({
        channelId: listingSources.telegramChannelId,
        n: sql<number>`count(distinct ${listingSources.listingId})::int`,
      })
      .from(listingSources)
      .innerJoin(listings, eq(listings.id, listingSources.listingId))
      .where(
        sql`${listingSources.telegramChannelId} = any(${channelIds}::uuid[]) and ${listings.status} = 'active'`,
      )
      .groupBy(listingSources.telegramChannelId),
  ]);

  const postsByChannel = new Map(postsRows.map((r) => [r.channelId, r.n]));
  const listingsByChannel = new Map(
    listingRows.map((r) => [r.channelId, r.n]),
  );

  const staleCutoff = new Date(Date.now() - STALE_SYNC_MINUTES * 60_000);
  return rows.map((r) => {
    const ch = r.channel;
    const base: AdminChannel = {
      ...ch,
      categoryName: r.categoryName,
      rawPostsCount: postsByChannel.get(ch.id) ?? 0,
      listingsCount: listingsByChannel.get(ch.id) ?? 0,
    };
    // Detect stalled syncs at read time. We don't write back — that
    // would race with a sync that's actually still alive. UI uses
    // these computed fields for display only.
    if (
      ch.lastSyncStatus === "running" &&
      ch.updatedAt &&
      ch.updatedAt < staleCutoff
    ) {
      return {
        ...base,
        lastSyncStatus: "stalled",
        lastSyncError: `No progress since ${ch.updatedAt.toISOString()} — click Run sync to retry`,
      };
    }
    return base;
  });
}
