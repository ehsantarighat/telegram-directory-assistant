import { and, desc, eq, gte, ilike, lt, lte, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { categories, channels, listings, locations } from "@/db/schema";

export const listingTypeSchema = z.enum(["rent", "sale", "daily"]);

export const listingsQuerySchema = z.object({
  type: listingTypeSchema.optional(),
  citySlug: z.string().min(1).max(64).optional(),
  districtSlug: z.string().min(1).max(64).optional(),
  minPriceUsd: z.coerce.number().nonnegative().optional(),
  maxPriceUsd: z.coerce.number().nonnegative().optional(),
  rooms: z.coerce.number().int().min(0).max(20).optional(),
  q: z.string().trim().min(1).max(120).optional(),
  // Cursor = ISO timestamp of the last item's postedAt
  cursor: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type ListingsQuery = z.infer<typeof listingsQuerySchema>;

export type ListingsPage = {
  items: ListingsListItem[];
  nextCursor: string | null;
};

export type ListingsListItem = {
  id: string;
  title: string;
  description: string;
  listingType: "rent" | "sale" | "daily";
  price: string | null;
  currency: string | null;
  priceUsd: string | null;
  city: { id: string; slug: string; name: string } | null;
  district: { id: string; slug: string; name: string } | null;
  channel: { id: string; username: string; title: string } | null;
  telegramUrl: string | null;
  mediaUrls: string[];
  attributes: Record<string, unknown>;
  postedAt: string;
};

/**
 * Paginated, filtered listings query. Cursor is the `postedAt` of the
 * last item returned (descending feed).
 */
export async function fetchListings(
  q: ListingsQuery,
): Promise<ListingsPage> {
  const city = locations;
  const district = locations;

  // Resolve slug-based filters to IDs in subqueries so we keep the main
  // query lean and indexable.
  const cityIdSubquery = q.citySlug
    ? db
        .select({ id: locations.id })
        .from(locations)
        .where(and(eq(locations.kind, "city"), eq(locations.slug, q.citySlug)))
        .limit(1)
    : null;

  const districtIdSubquery = q.districtSlug
    ? db
        .select({ id: locations.id })
        .from(locations)
        .where(
          and(
            eq(locations.kind, "district"),
            eq(locations.slug, q.districtSlug),
          ),
        )
        .limit(1)
    : null;

  const conditions = [eq(listings.status, "active")];
  if (q.type) conditions.push(eq(listings.listingType, q.type));
  if (cityIdSubquery)
    conditions.push(sql`${listings.cityId} = (${cityIdSubquery})`);
  if (districtIdSubquery)
    conditions.push(sql`${listings.districtId} = (${districtIdSubquery})`);
  if (q.minPriceUsd !== undefined)
    conditions.push(gte(listings.priceUsd, q.minPriceUsd.toString()));
  if (q.maxPriceUsd !== undefined)
    conditions.push(lte(listings.priceUsd, q.maxPriceUsd.toString()));
  if (q.rooms !== undefined) {
    conditions.push(
      sql`(${listings.attributes} ->> 'rooms')::int = ${q.rooms}`,
    );
  }
  if (q.q) {
    const like = `%${q.q}%`;
    conditions.push(
      or(ilike(listings.title, like), ilike(listings.description, like))!,
    );
  }
  if (q.cursor) {
    conditions.push(lt(listings.postedAt, new Date(q.cursor)));
  }

  // Fetch limit + 1 so we can detect whether more pages exist without a
  // separate count query.
  const rows = await db
    .select({
      id: listings.id,
      title: listings.title,
      description: listings.description,
      listingType: listings.listingType,
      price: listings.price,
      currency: listings.currency,
      priceUsd: listings.priceUsd,
      telegramUrl: listings.telegramUrl,
      mediaUrls: listings.mediaUrls,
      attributes: listings.attributes,
      postedAt: listings.postedAt,
      cityId: listings.cityId,
      districtId: listings.districtId,
      channelId: listings.channelId,
    })
    .from(listings)
    .where(and(...conditions))
    .orderBy(desc(listings.postedAt), desc(listings.id))
    .limit(q.limit + 1);

  const hasMore = rows.length > q.limit;
  const slice = hasMore ? rows.slice(0, q.limit) : rows;

  // Hydrate referenced cities, districts, channels in a single round-trip each.
  const cityIds = unique(slice.map((r) => r.cityId).filter(Boolean) as string[]);
  const districtIds = unique(
    slice.map((r) => r.districtId).filter(Boolean) as string[],
  );
  const channelIds = unique(
    slice.map((r) => r.channelId).filter(Boolean) as string[],
  );

  const [cityRows, districtRows, channelRows] = await Promise.all([
    cityIds.length
      ? db
          .select({ id: city.id, slug: city.slug, name: city.name })
          .from(city)
          .where(sql`${city.id} = ANY(${cityIds}::uuid[])`)
      : Promise.resolve([] as Array<{ id: string; slug: string; name: string }>),
    districtIds.length
      ? db
          .select({ id: district.id, slug: district.slug, name: district.name })
          .from(district)
          .where(sql`${district.id} = ANY(${districtIds}::uuid[])`)
      : Promise.resolve([] as Array<{ id: string; slug: string; name: string }>),
    channelIds.length
      ? db
          .select({
            id: channels.id,
            username: channels.username,
            title: channels.title,
          })
          .from(channels)
          .where(sql`${channels.id} = ANY(${channelIds}::uuid[])`)
      : Promise.resolve([] as Array<{ id: string; username: string; title: string }>),
  ]);

  const cityById = new Map(cityRows.map((r) => [r.id, r]));
  const districtById = new Map(districtRows.map((r) => [r.id, r]));
  const channelById = new Map(channelRows.map((r) => [r.id, r]));

  const items: ListingsListItem[] = slice.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    listingType: r.listingType,
    price: r.price,
    currency: r.currency,
    priceUsd: r.priceUsd,
    city: r.cityId ? (cityById.get(r.cityId) ?? null) : null,
    district: r.districtId ? (districtById.get(r.districtId) ?? null) : null,
    channel: r.channelId ? (channelById.get(r.channelId) ?? null) : null,
    telegramUrl: r.telegramUrl,
    mediaUrls: r.mediaUrls,
    attributes: r.attributes,
    postedAt: r.postedAt.toISOString(),
  }));

  const nextCursor =
    hasMore && slice.length > 0
      ? slice[slice.length - 1].postedAt.toISOString()
      : null;

  return { items, nextCursor };
}

/**
 * Single listing detail with joined location/channel/category.
 */
export async function fetchListingById(id: string) {
  const [row] = await db
    .select({
      listing: listings,
      category: categories,
      channel: channels,
    })
    .from(listings)
    .leftJoin(categories, eq(listings.categoryId, categories.id))
    .leftJoin(channels, eq(listings.channelId, channels.id))
    .where(eq(listings.id, id))
    .limit(1);

  if (!row) return null;

  const [cityRow, districtRow] = await Promise.all([
    row.listing.cityId
      ? db
          .select({
            id: locations.id,
            slug: locations.slug,
            name: locations.name,
          })
          .from(locations)
          .where(eq(locations.id, row.listing.cityId))
          .limit(1)
      : Promise.resolve([]),
    row.listing.districtId
      ? db
          .select({
            id: locations.id,
            slug: locations.slug,
            name: locations.name,
          })
          .from(locations)
          .where(eq(locations.id, row.listing.districtId))
          .limit(1)
      : Promise.resolve([]),
  ]);

  return {
    id: row.listing.id,
    title: row.listing.title,
    description: row.listing.description,
    listingType: row.listing.listingType,
    price: row.listing.price,
    currency: row.listing.currency,
    priceUsd: row.listing.priceUsd,
    contactPhones: row.listing.contactPhones,
    mediaUrls: row.listing.mediaUrls,
    attributes: row.listing.attributes,
    telegramUrl: row.listing.telegramUrl,
    status: row.listing.status,
    language: row.listing.language,
    postedAt: row.listing.postedAt.toISOString(),
    expiresAt: row.listing.expiresAt?.toISOString() ?? null,
    category: row.category
      ? { id: row.category.id, slug: row.category.slug, name: row.category.name }
      : null,
    channel: row.channel
      ? {
          id: row.channel.id,
          username: row.channel.username,
          title: row.channel.title,
        }
      : null,
    city: cityRow[0] ?? null,
    district: districtRow[0] ?? null,
  };
}

function unique<T>(xs: T[]): T[] {
  return Array.from(new Set(xs));
}
