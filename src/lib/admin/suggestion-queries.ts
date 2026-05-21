import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  categories,
  channelSuggestions,
  userProfiles,
  type ChannelSuggestion,
} from "@/db/schema";

export type AdminSuggestion = ChannelSuggestion & {
  submitterName: string | null;
  categoryName: string | null;
};

export async function fetchAdminSuggestions(opts: {
  status?: ChannelSuggestion["status"];
} = {}): Promise<AdminSuggestion[]> {
  const baseQuery = db
    .select({
      suggestion: channelSuggestions,
      submitterName: userProfiles.name,
      categoryName: categories.name,
    })
    .from(channelSuggestions)
    .leftJoin(userProfiles, eq(userProfiles.id, channelSuggestions.userId))
    .leftJoin(categories, eq(categories.id, channelSuggestions.suggestedCategoryId))
    .orderBy(desc(channelSuggestions.createdAt));

  const rows = await (opts.status
    ? baseQuery.where(eq(channelSuggestions.status, opts.status))
    : baseQuery);

  return rows.map((r) => ({
    ...r.suggestion,
    submitterName: r.submitterName,
    categoryName: r.categoryName,
  }));
}
