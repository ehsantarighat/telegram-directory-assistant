import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { savedSearches, type SavedSearch } from "@/db/schema";

export type UserSavedSearch = SavedSearch;

/**
 * The signed-in user's saved searches, newest first. Used by
 * /profile to render the list with delete buttons.
 */
export async function fetchUserSavedSearches(
  userId: string,
): Promise<UserSavedSearch[]> {
  return await db
    .select()
    .from(savedSearches)
    .where(eq(savedSearches.userId, userId))
    .orderBy(desc(savedSearches.createdAt));
}
