import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  categories,
  telegramChannels,
  type TelegramChannel,
} from "@/db/schema";

export type AdminChannel = TelegramChannel & {
  categoryName: string | null;
};

export async function fetchAdminChannels(): Promise<AdminChannel[]> {
  const rows = await db
    .select({
      channel: telegramChannels,
      categoryName: categories.name,
    })
    .from(telegramChannels)
    .leftJoin(categories, eq(categories.id, telegramChannels.categoryId))
    .orderBy(desc(telegramChannels.createdAt));

  return rows.map((r) => ({ ...r.channel, categoryName: r.categoryName }));
}
