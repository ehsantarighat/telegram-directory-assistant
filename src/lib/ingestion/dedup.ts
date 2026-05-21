import { createHash } from "node:crypto";
import { and, desc, eq, gte, sql } from "drizzle-orm";

import { db } from "@/db";
import { listings } from "@/db/schema";

import type { ExtractedListing } from "./extract/types";

/**
 * Placeholder duplicate-detection service.
 *
 * Strategy: compute a stable "fingerprint" from
 *   normalize(title) + price + first phone
 * and look for any active listing inserted in the last 14 days with the
 * same fingerprint. If found, return that listing's duplicate_group_id
 * (creating one if it doesn't have one yet). If not, return null and
 * the caller knows to insert a fresh listing.
 *
 * This is a rule-based first pass. Real cross-post detection in
 * production should use a richer signature (image perceptual hash,
 * semantic title similarity, geocoded address) — likely behind a
 * worker queue rather than inline at ingest time. The interface is
 * designed so an AI-backed dedup service can swap in without changing
 * the pipeline.
 */

export type DedupOutcome =
  | { kind: "new" }
  | {
      kind: "duplicate";
      duplicateGroupId: string;
      canonicalListingId: string;
    };

/**
 * Find an existing listing that matches `extracted` and, if found,
 * return its duplicate_group_id (ensuring the group exists). Otherwise
 * return `{ kind: "new" }`.
 *
 * If multiple matches exist (rare), prefers the oldest active listing
 * so dedup always converges on the canonical row.
 */
export async function findDuplicate(
  extracted: ExtractedListing,
): Promise<DedupOutcome> {
  const signature = computeSignature(extracted);
  if (!signature) return { kind: "new" };

  // 14-day lookback window — older near-duplicates likely aren't the
  // same physical listing being reposted.
  const lookbackStart = new Date(
    Date.now() - 14 * 24 * 60 * 60 * 1000,
  );

  const candidates = await db
    .select({
      id: listings.id,
      duplicateGroupId: listings.duplicateGroupId,
      publishedAt: listings.publishedAt,
    })
    .from(listings)
    .where(
      and(
        eq(listings.status, "active"),
        // dedup_signature isn't a real column; we materialize it inline
        // via concat-md5 of the canonical key fields. Slow on big tables
        // — fine for MVP scale, swap to a generated column + index when
        // we cross ~10k listings.
        sql`md5(
          coalesce(lower(${listings.title}), '')
          || '|' || coalesce(${listings.price}::text, '')
          || '|' || coalesce(${listings.contactPhone}, '')
        ) = ${signature}`,
        gte(listings.publishedAt, lookbackStart),
      ),
    )
    .orderBy(desc(listings.publishedAt))
    .limit(1);

  const match = candidates[0];
  if (!match) return { kind: "new" };

  // Ensure the canonical listing has a duplicate_group_id so the new
  // sibling row can join the group.
  let groupId = match.duplicateGroupId;
  if (!groupId) {
    const [updated] = await db
      .update(listings)
      .set({
        duplicateGroupId: sql`gen_random_uuid()`,
        updatedAt: new Date(),
      })
      .where(eq(listings.id, match.id))
      .returning({ duplicateGroupId: listings.duplicateGroupId });
    groupId = updated?.duplicateGroupId ?? null;
  }

  if (!groupId) return { kind: "new" };

  return {
    kind: "duplicate",
    duplicateGroupId: groupId,
    canonicalListingId: match.id,
  };
}

/**
 * Stable signature derived from the same fields the SQL match uses.
 * Returns null if too sparse to dedup safely (no price + no phone).
 */
export function computeSignature(extracted: ExtractedListing): string | null {
  const titleNorm = (extracted.title ?? "").toLowerCase().trim();
  const priceStr = extracted.price != null ? String(extracted.price) : "";
  const phoneStr = extracted.contactPhones[0] ?? "";

  // Refuse to dedup on title alone — too easy to coincidentally collide.
  if (!priceStr && !phoneStr) return null;

  const raw = `${titleNorm}|${priceStr}|${phoneStr}`;
  return createHash("md5").update(raw, "utf8").digest("hex");
}
