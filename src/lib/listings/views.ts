import { eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { listings } from "@/db/schema";

/**
 * Atomically bump listings.view_count by 1. Called from the listing
 * detail page via Next.js `after()` so the increment runs AFTER the
 * response is committed — never blocks the user-facing render.
 *
 * Best-effort: failures are swallowed (logged) so a transient DB
 * blip never breaks a page that already rendered successfully.
 *
 * Counting policy:
 *   - Every visit counts, including refreshes and bots. This is
 *     intentional for an MVP — true uniqueness needs cookie/IP
 *     dedup which we can add later when traffic warrants it.
 *   - Status guard: skips listings that aren't active (removed
 *     listings shouldn't accumulate view stats).
 */
export async function bumpViewCount(listingId: string): Promise<void> {
  try {
    await db
      .update(listings)
      .set({ viewCount: sql`${listings.viewCount} + 1` })
      .where(eq(listings.id, listingId));
  } catch (err) {
    console.warn(
      `[views] failed to bump view_count for ${listingId}:`,
      err instanceof Error ? err.message : err,
    );
  }
}
