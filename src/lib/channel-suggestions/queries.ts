import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  categories,
  channelSuggestions,
  type ChannelSuggestion,
} from "@/db/schema";

export type UserSuggestion = ChannelSuggestion & {
  categoryName: string | null;
};

/**
 * The signed-in user's own channel suggestions, newest first. Joined
 * with categories so the row can show the suggested category name.
 */
export async function fetchUserSuggestions(
  userId: string,
): Promise<UserSuggestion[]> {
  const rows = await db
    .select({
      suggestion: channelSuggestions,
      categoryName: categories.name,
    })
    .from(channelSuggestions)
    .leftJoin(
      categories,
      eq(categories.id, channelSuggestions.suggestedCategoryId),
    )
    .where(eq(channelSuggestions.userId, userId))
    .orderBy(desc(channelSuggestions.createdAt));

  return rows.map((r) => ({ ...r.suggestion, categoryName: r.categoryName }));
}

/**
 * Active categories for the picker. MVP only has Real Estate, but the
 * picker is wired generically so future verticals show up automatically.
 */
export async function fetchActiveCategories() {
  return await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
    })
    .from(categories)
    .where(eq(categories.status, "active"))
    .orderBy(categories.name);
}
