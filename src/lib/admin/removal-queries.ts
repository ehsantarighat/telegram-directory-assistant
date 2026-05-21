import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  listings,
  removalRequests,
  telegramChannels,
  type RemovalRequest,
} from "@/db/schema";

export type AdminRemovalRequest = RemovalRequest & {
  listingTitle: string | null;
  channelUsername: string | null;
  channelTitle: string | null;
};

export async function fetchAdminRemovalRequests(opts: {
  status?: RemovalRequest["status"];
} = {}): Promise<AdminRemovalRequest[]> {
  const baseQuery = db
    .select({
      request: removalRequests,
      listingTitle: listings.title,
      channelUsername: telegramChannels.username,
      channelTitle: telegramChannels.title,
    })
    .from(removalRequests)
    .leftJoin(listings, eq(listings.id, removalRequests.listingId))
    .leftJoin(
      telegramChannels,
      eq(telegramChannels.id, removalRequests.telegramChannelId),
    )
    .orderBy(desc(removalRequests.createdAt));

  const rows = await (opts.status
    ? baseQuery.where(eq(removalRequests.status, opts.status))
    : baseQuery);

  return rows.map((r) => ({
    ...r.request,
    listingTitle: r.listingTitle,
    channelUsername: r.channelUsername,
    channelTitle: r.channelTitle,
  }));
}
