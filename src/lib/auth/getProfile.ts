import { eq } from "drizzle-orm";

import { db } from "@/db";
import { userProfiles, type UserProfile } from "@/db/schema";

/**
 * Load the user_profiles row for a given auth user id. Returns null if
 * the trigger hasn't run yet (race) or the user was deleted.
 *
 * Phase 5 relies on the handle_new_user() Postgres trigger to create
 * a profile row for every new auth.users record, so callers can usually
 * assume non-null. We still return null-safe for defensive code paths.
 */
export async function getProfile(userId: string): Promise<UserProfile | null> {
  const rows = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.id, userId))
    .limit(1);
  return rows[0] ?? null;
}
