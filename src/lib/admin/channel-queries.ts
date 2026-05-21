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

  return rows.map((r) => ({ ...r.channel, categoryName: r.categoryName }));
}
