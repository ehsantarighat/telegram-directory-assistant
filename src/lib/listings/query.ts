import { and, desc, eq, gte, ilike, lt, lte, or } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { categories, listings, telegramChannels } from "@/db/schema";

export const listingTypeSchema = z.enum(["rent", "sale", "daily_rent"]);
export const propertyTypeSchema = z.enum([
  "apartment",
  "house",
  "commercial",
  "land",
  "room",
  "studio",
]);

/**
 * Query schema for GET /api/listings. Mirrors what the listings UI
 * (Phase 4) will send, plus what saved-searches store in filters_json.
 *
 * Cursor: ISO timestamp of the last item's `published_at`. The query
 * orders by published_at desc and uses (published_at < cursor) for
 * pagination.
 */
export const listingsQuerySchema = z.object({
  type: listingTypeSchema.optional(),
  propertyType: propertyTypeSchema.optional(),
  city: z.string().min(1).max(64).optional(),
  district: z.string().min(1).max(64).optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  currency: z.string().length(3).optional(),
  rooms: z.coerce.number().int().min(0).max(20).optional(),
  hasPhotos: z.coerce.boolean().optional(),
  q: z.string().trim().min(1).max(120).optional(),
  cursor: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type ListingsQuery = z.infer<typeof listingsQuerySchema>;

export type ListingsListItem = {
  id: string;
  title: string;
  summary: string | null;
  listingType: "rent" | "sale" | "daily_rent";
  propertyType:
    | "apartment"
    | "house"
    | "commercial"
    | "land"
    | "room"
    | "studio"
    | null;
  price: string | null;
  currency: string | null;
  city: string | null;
  district: string | null;
  rooms: number | null;
  areaSqm: string | null;
  floor: number | null;
  totalFloors: number | null;
  hasPhotos: boolean;
  mainImageUrl: string | null;
  mediaUrls: string[];
  sourceCount: number;
  savedCount: number;
  publishedAt: string | null;
};

export type ListingsPage = {
  items: ListingsListItem[];
  nextCursor: string | null;
};

export async function fetchListings(q: ListingsQuery): Promise<ListingsPage> {
  const conditions = [eq(listings.status, "active")];
  if (q.type) conditions.push(eq(listings.listingType, q.type));
  if (q.propertyType) conditions.push(eq(listings.propertyType, q.propertyType));
  if (q.city) conditions.push(eq(listings.city, q.city));
  if (q.district) conditions.push(eq(listings.district, q.district));
  if (q.currency) conditions.push(eq(listings.currency, q.currency));
  if (q.rooms !== undefined) conditions.push(eq(listings.rooms, q.rooms));
  if (q.minPrice !== undefined)
    conditions.push(gte(listings.price, q.minPrice.toString()));
  if (q.maxPrice !== undefined)
    conditions.push(lte(listings.price, q.maxPrice.toString()));
  if (q.hasPhotos !== undefined)
    conditions.push(eq(listings.hasPhotos, q.hasPhotos));
  if (q.q) {
    const like = `%${q.q}%`;
    conditions.push(
      or(
        ilike(listings.title, like),
        ilike(listings.summary, like),
        ilike(listings.originalText, like),
      )!,
    );
  }
  if (q.cursor) {
    conditions.push(lt(listings.publishedAt, new Date(q.cursor)));
  }

  const rows = await db
    .select({
      id: listings.id,
      title: listings.title,
      summary: listings.summary,
      listingType: listings.listingType,
      propertyType: listings.propertyType,
      price: listings.price,
      currency: listings.currency,
      city: listings.city,
      district: listings.district,
      rooms: listings.rooms,
      areaSqm: listings.areaSqm,
      floor: listings.floor,
      totalFloors: listings.totalFloors,
      hasPhotos: listings.hasPhotos,
      mainImageUrl: listings.mainImageUrl,
      mediaUrls: listings.mediaUrls,
      sourceCount: listings.sourceCount,
      savedCount: listings.savedCount,
      publishedAt: listings.publishedAt,
    })
    .from(listings)
    .where(and(...conditions))
    .orderBy(desc(listings.publishedAt), desc(listings.id))
    .limit(q.limit + 1);

  const hasMore = rows.length > q.limit;
  const slice = hasMore ? rows.slice(0, q.limit) : rows;

  const items: ListingsListItem[] = slice.map((r) => ({
    id: r.id,
    title: r.title,
    summary: r.summary,
    listingType: r.listingType,
    propertyType: r.propertyType,
    price: r.price,
    currency: r.currency,
    city: r.city,
    district: r.district,
    rooms: r.rooms,
    areaSqm: r.areaSqm,
    floor: r.floor,
    totalFloors: r.totalFloors,
    hasPhotos: r.hasPhotos,
    mainImageUrl: r.mainImageUrl,
    mediaUrls: r.mediaUrls,
    sourceCount: r.sourceCount,
    savedCount: r.savedCount,
    publishedAt: r.publishedAt?.toISOString() ?? null,
  }));

  const last = slice[slice.length - 1];
  const nextCursor =
    hasMore && last?.publishedAt ? last.publishedAt.toISOString() : null;

  return { items, nextCursor };
}

/**
 * Full detail of one listing including category + primary channel.
 * Source-channel chips (Phase 4) will fetch from `listing_sources`
 * separately to keep this query slim.
 */
export async function fetchListingById(id: string) {
  const [row] = await db
    .select({
      listing: listings,
      category: categories,
    })
    .from(listings)
    .leftJoin(categories, eq(listings.categoryId, categories.id))
    .where(eq(listings.id, id))
    .limit(1);

  if (!row) return null;

  return {
    id: row.listing.id,
    title: row.listing.title,
    summary: row.listing.summary,
    originalText: row.listing.originalText,
    detectedLanguage: row.listing.detectedLanguage,
    listingType: row.listing.listingType,
    propertyType: row.listing.propertyType,
    country: row.listing.country,
    city: row.listing.city,
    district: row.listing.district,
    neighborhood: row.listing.neighborhood,
    price: row.listing.price,
    currency: row.listing.currency,
    rooms: row.listing.rooms,
    areaSqm: row.listing.areaSqm,
    floor: row.listing.floor,
    totalFloors: row.listing.totalFloors,
    furnished: row.listing.furnished,
    newBuilding: row.listing.newBuilding,
    renovationStatus: row.listing.renovationStatus,
    metroNearby: row.listing.metroNearby,
    ownerOrAgent: row.listing.ownerOrAgent,
    commission: row.listing.commission,
    parking: row.listing.parking,
    balcony: row.listing.balcony,
    elevator: row.listing.elevator,
    petsAllowed: row.listing.petsAllowed,
    heatingType: row.listing.heatingType,
    buildingMaterial: row.listing.buildingMaterial,
    contactPhone: row.listing.contactPhone,
    contactTelegram: row.listing.contactTelegram,
    hasPhotos: row.listing.hasPhotos,
    mainImageUrl: row.listing.mainImageUrl,
    mediaUrls: row.listing.mediaUrls,
    sourceCount: row.listing.sourceCount,
    savedCount: row.listing.savedCount,
    duplicateGroupId: row.listing.duplicateGroupId,
    status: row.listing.status,
    publishedAt: row.listing.publishedAt?.toISOString() ?? null,
    importedAt: row.listing.importedAt.toISOString(),
    primaryRawPostId: row.listing.primaryRawPostId,
    category: row.category
      ? {
          id: row.category.id,
          slug: row.category.slug,
          name: row.category.name,
        }
      : null,
  };
}

// Re-export so route handlers can pull these from a single import.
export { listings, telegramChannels };
