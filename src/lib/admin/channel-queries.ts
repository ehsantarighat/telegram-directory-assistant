import { desc, eq, ne } from "drizzle-orm";

import { db } from "@/db";
import {
  categories,
  telegramChannels,
  type TelegramChannel,
} from "@/db/schema";

export type AdminChannel = TelegramChannel & {
  categoryName: string | null;
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

  const staleCutoff = new Date(Date.now() - STALE_SYNC_MINUTES * 60_000);
  return rows.map((r) => {
    const ch = r.channel;
    // Detect stalled syncs at read time. We don't write back — that
    // would race with a sync that's actually still alive. UI uses
    // these computed fields for display only.
    if (
      ch.lastSyncStatus === "running" &&
      ch.updatedAt &&
      ch.updatedAt < staleCutoff
    ) {
      return {
        ...ch,
        categoryName: r.categoryName,
        lastSyncStatus: "stalled",
        lastSyncError: `No progress since ${ch.updatedAt.toISOString()} — click Run sync to retry`,
      };
    }
    return { ...ch, categoryName: r.categoryName };
  });
}
