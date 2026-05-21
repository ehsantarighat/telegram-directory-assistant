import { and, asc, desc, eq, ilike, inArray, or } from "drizzle-orm";

import { db } from "@/db";
import {
  listingSources,
  listings,
  telegramChannels,
} from "@/db/schema";

export type AdminListingRow = {
  id: string;
  title: string;
  listingType: "rent" | "sale" | "daily_rent";
  status: "active" | "hidden" | "removed" | "duplicate" | "incomplete";
  city: string | null;
  district: string | null;
  price: string | null;
  currency: string | null;
  sourceCount: number;
  savedCount: number;
  publishedAt: string | null;
  duplicateGroupId: string | null;
  primaryChannel: {
    id: string;
    username: string;
    title: string;
  } | null;
};

export type AdminListingsQuery = {
  q?: string;
  status?: "active" | "hidden" | "removed" | "duplicate" | "incomplete";
  type?: "rent" | "sale" | "daily_rent";
  limit?: number;
};

export async function fetchAdminListings(
  q: AdminListingsQuery = {},
): Promise<AdminListingRow[]> {
  const conditions = [];
  if (q.status) conditions.push(eq(listings.status, q.status));
  if (q.type) conditions.push(eq(listings.listingType, q.type));
  if (q.q) {
    const like = `%${q.q}%`;
    conditions.push(
      or(
        ilike(listings.title, like),
        ilike(listings.summary, like),
        ilike(listings.city, like),
        ilike(listings.district, like),
      )!,
    );
  }

  const rows = await db
    .select({
      id: listings.id,
      title: listings.title,
      listingType: listings.listingType,
      status: listings.status,
      city: listings.city,
      district: listings.district,
      price: listings.price,
      currency: listings.currency,
      sourceCount: listings.sourceCount,
      savedCount: listings.savedCount,
      publishedAt: listings.publishedAt,
      duplicateGroupId: listings.duplicateGroupId,
    })
    .from(listings)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(listings.publishedAt), desc(listings.id))
    .limit(q.limit ?? 100);

  // Hydrate primary channel like the public feed does
  const ids = rows.map((r) => r.id);
  const channelMap = new Map<
    string,
    { id: string; username: string; title: string }
  >();
  if (ids.length > 0) {
    const sources = await db
      .select({
        listingId: listingSources.listingId,
        channelId: telegramChannels.id,
        username: telegramChannels.username,
        title: telegramChannels.title,
        publishedAt: listingSources.publishedAt,
      })
      .from(listingSources)
      .innerJoin(
        telegramChannels,
        eq(telegramChannels.id, listingSources.telegramChannelId),
      )
      .where(inArray(listingSources.listingId, ids))
      .orderBy(asc(listingSources.publishedAt));
    for (const s of sources) {
      if (!channelMap.has(s.listingId)) {
        channelMap.set(s.listingId, {
          id: s.channelId,
          username: s.username,
          title: s.title,
        });
      }
    }
  }

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    listingType: r.listingType,
    status: r.status,
    city: r.city,
    district: r.district,
    price: r.price,
    currency: r.currency,
    sourceCount: r.sourceCount,
    savedCount: r.savedCount,
    publishedAt: r.publishedAt?.toISOString() ?? null,
    duplicateGroupId: r.duplicateGroupId,
    primaryChannel: channelMap.get(r.id) ?? null,
  }));
}
