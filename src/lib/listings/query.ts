import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lt,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  categories,
  listingSources,
  listings,
  telegramChannels,
} from "@/db/schema";

export const listingTypeSchema = z.enum(["rent", "sale", "daily_rent"]);
export const propertyTypeSchema = z.enum([
  "apartment",
  "house",
  "commercial",
  "land",
  "room",
  "studio",
]);
export const sortSchema = z.enum([
  "newest",
  "price_asc",
  "price_desc",
  "most_saved",
]);

/**
 * Query schema for GET /api/listings and the /listings page.
 *
 * Filters mirror the FiltersDrawer fields. Cursor pagination is keyed
 * on the active sort column to keep page boundaries consistent.
 *
 * Boolean filters accept both true/false strings and "1"/"0" for
 * URL ergonomics ("?furnished=1").
 */
const booleanish = z
  .union([z.boolean(), z.string()])
  .transform((v) =>
    typeof v === "boolean"
      ? v
      : ["1", "true", "yes", "on"].includes(v.toLowerCase()),
  );

export const listingsQuerySchema = z.object({
  // Primary
  type: listingTypeSchema.optional(),
  propertyType: propertyTypeSchema.optional(),
  city: z.string().min(1).max(64).optional(),
  district: z.string().min(1).max(64).optional(),
  channelUsername: z.string().min(1).max(64).optional(),
  q: z.string().trim().min(1).max(120).optional(),

  // Money
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  currency: z.string().length(3).toUpperCase().optional(),

  // Size
  rooms: z.coerce.number().int().min(0).max(20).optional(),
  minAreaSqm: z.coerce.number().nonnegative().optional(),
  maxAreaSqm: z.coerce.number().nonnegative().optional(),
  floor: z.coerce.number().int().min(0).max(200).optional(),
  totalFloors: z.coerce.number().int().min(1).max(200).optional(),

  // Booleans (basic)
  hasPhotos: booleanish.optional(),
  furnished: booleanish.optional(),

  // Booleans (advanced)
  newBuilding: booleanish.optional(),
  metroNearby: booleanish.optional(),
  parking: booleanish.optional(),
  balcony: booleanish.optional(),
  elevator: booleanish.optional(),
  petsAllowed: booleanish.optional(),

  // Advanced text
  renovationStatus: z.string().min(1).max(64).optional(),
  heatingType: z.string().min(1).max(64).optional(),
  buildingMaterial: z.string().min(1).max(64).optional(),
  ownerOrAgent: z.enum(["owner", "agent"]).optional(),

  // Order
  sort: sortSchema.default("newest"),

  // Pagination
  cursor: z.string().optional(),
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
  neighborhood: string | null;
  rooms: number | null;
  areaSqm: string | null;
  floor: number | null;
  totalFloors: number | null;
  furnished: boolean | null;
  hasPhotos: boolean;
  mainImageUrl: string | null;
  mediaUrls: string[];
  sourceCount: number;
  savedCount: number;
  publishedAt: string | null;
  primaryChannel: {
    id: string;
    username: string;
    title: string;
  } | null;
};

export type ListingsPage = {
  items: ListingsListItem[];
  nextCursor: string | null;
  sort: ListingsQuery["sort"];
};

/**
 * Cursor encodes (orderKey, id) of the last item, base64-json.
 * orderKey is the value of the active sort column (timestamp / number).
 */
function encodeCursor(orderKey: string | number, id: string): string {
  return Buffer.from(JSON.stringify({ k: orderKey, id }), "utf8").toString(
    "base64url",
  );
}

function decodeCursor(
  cursor: string,
): { k: string | number; id: string } | null {
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    );
    if (typeof parsed?.id !== "string") return null;
    return { k: parsed.k, id: parsed.id };
  } catch {
    return null;
  }
}

/**
 * "Is this listing visible on the public feed?" — encapsulates the
 * fact that a listing is only shown if AT LEAST ONE of its source
 * channels is still active. Listings whose only sources are removed
 * channels stay in the DB (for attribution / future undelete) but
 * don't appear on /listings or /listings/[id], matching what the
 * admin dashboard counts.
 *
 * Implemented as an EXISTS subquery so it stays one set-based check
 * regardless of how many sources the listing has. Re-used by
 * fetchListings, fetchListingById, and fetchListingFacets so all
 * three views stay consistent.
 */
const hasActiveSourceChannel = sql`exists (
  select 1
  from ${listingSources} ls
  inner join ${telegramChannels} tc on tc.id = ls.telegram_channel_id
  where ls.listing_id = ${listings.id} and tc.status = 'active'
)`;

export async function fetchListings(q: ListingsQuery): Promise<ListingsPage> {
  const conditions = [eq(listings.status, "active"), hasActiveSourceChannel];

  if (q.type) conditions.push(eq(listings.listingType, q.type));
  if (q.propertyType)
    conditions.push(eq(listings.propertyType, q.propertyType));
  if (q.city) conditions.push(eq(listings.city, q.city));
  if (q.district) conditions.push(eq(listings.district, q.district));
  if (q.currency) conditions.push(eq(listings.currency, q.currency));
  if (q.rooms !== undefined) conditions.push(eq(listings.rooms, q.rooms));
  if (q.minPrice !== undefined)
    conditions.push(gte(listings.price, q.minPrice.toString()));
  if (q.maxPrice !== undefined)
    conditions.push(lte(listings.price, q.maxPrice.toString()));
  if (q.minAreaSqm !== undefined)
    conditions.push(gte(listings.areaSqm, q.minAreaSqm.toString()));
  if (q.maxAreaSqm !== undefined)
    conditions.push(lte(listings.areaSqm, q.maxAreaSqm.toString()));
  if (q.floor !== undefined) conditions.push(eq(listings.floor, q.floor));
  if (q.totalFloors !== undefined)
    conditions.push(eq(listings.totalFloors, q.totalFloors));

  if (q.hasPhotos !== undefined)
    conditions.push(eq(listings.hasPhotos, q.hasPhotos));
  if (q.furnished !== undefined)
    conditions.push(eq(listings.furnished, q.furnished));
  if (q.newBuilding !== undefined)
    conditions.push(eq(listings.newBuilding, q.newBuilding));
  if (q.metroNearby !== undefined)
    conditions.push(eq(listings.metroNearby, q.metroNearby));
  if (q.parking !== undefined)
    conditions.push(eq(listings.parking, q.parking));
  if (q.balcony !== undefined)
    conditions.push(eq(listings.balcony, q.balcony));
  if (q.elevator !== undefined)
    conditions.push(eq(listings.elevator, q.elevator));
  if (q.petsAllowed !== undefined)
    conditions.push(eq(listings.petsAllowed, q.petsAllowed));

  if (q.renovationStatus)
    conditions.push(eq(listings.renovationStatus, q.renovationStatus));
  if (q.heatingType)
    conditions.push(eq(listings.heatingType, q.heatingType));
  if (q.buildingMaterial)
    conditions.push(eq(listings.buildingMaterial, q.buildingMaterial));
  if (q.ownerOrAgent)
    conditions.push(eq(listings.ownerOrAgent, q.ownerOrAgent));

  if (q.channelUsername) {
    // Join via listing_sources for channel filtering (works for primary and
    // duplicate-group sources).
    conditions.push(
      sql`exists (
        select 1 from ${listingSources} ls
        join ${telegramChannels} tc on tc.id = ls.${listingSources.telegramChannelId}
        where ls.${listingSources.listingId} = ${listings.id}
          and tc.${telegramChannels.username} = ${q.channelUsername}
      )`,
    );
  }

  if (q.q) {
    const like = `%${q.q}%`;
    conditions.push(
      or(
        ilike(listings.title, like),
        ilike(listings.summary, like),
        ilike(listings.originalText, like),
        ilike(listings.city, like),
        ilike(listings.district, like),
      )!,
    );
  }

  // Cursor — applied based on current sort
  const decoded = q.cursor ? decodeCursor(q.cursor) : null;

  switch (q.sort) {
    case "price_asc":
      if (decoded) {
        conditions.push(
          sql`(${listings.price}, ${listings.id}) > (${decoded.k}::numeric, ${decoded.id})`,
        );
      }
      break;
    case "price_desc":
      if (decoded) {
        conditions.push(
          sql`(${listings.price}, ${listings.id}) < (${decoded.k}::numeric, ${decoded.id})`,
        );
      }
      break;
    case "most_saved":
      if (decoded) {
        conditions.push(
          sql`(${listings.savedCount}, ${listings.id}) < (${decoded.k}::bigint, ${decoded.id})`,
        );
      }
      break;
    case "newest":
    default:
      if (decoded) {
        conditions.push(lt(listings.publishedAt, new Date(decoded.k as string)));
      }
      break;
  }

  // Pick orderBy based on sort
  const orderBy = (() => {
    switch (q.sort) {
      case "price_asc":
        return [asc(listings.price), asc(listings.id)];
      case "price_desc":
        return [desc(listings.price), desc(listings.id)];
      case "most_saved":
        return [desc(listings.savedCount), desc(listings.id)];
      case "newest":
      default:
        return [desc(listings.publishedAt), desc(listings.id)];
    }
  })();

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
      neighborhood: listings.neighborhood,
      rooms: listings.rooms,
      areaSqm: listings.areaSqm,
      floor: listings.floor,
      totalFloors: listings.totalFloors,
      furnished: listings.furnished,
      hasPhotos: listings.hasPhotos,
      mainImageUrl: listings.mainImageUrl,
      mediaUrls: listings.mediaUrls,
      sourceCount: listings.sourceCount,
      savedCount: listings.savedCount,
      publishedAt: listings.publishedAt,
      primaryRawPostId: listings.primaryRawPostId,
    })
    .from(listings)
    .where(and(...conditions))
    .orderBy(...orderBy)
    .limit(q.limit + 1);

  const hasMore = rows.length > q.limit;
  const slice = hasMore ? rows.slice(0, q.limit) : rows;

  // Hydrate the primary channel for each row in one round-trip via
  // listing_sources. (Cheaper than a left-join because most rows share the
  // same handful of channels.)
  const ids = slice.map((r) => r.id);
  const channelMap = new Map<string, ListingsListItem["primaryChannel"]>();
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

    // For each listing, the earliest-published source is the primary channel.
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
    neighborhood: r.neighborhood,
    rooms: r.rooms,
    areaSqm: r.areaSqm,
    floor: r.floor,
    totalFloors: r.totalFloors,
    furnished: r.furnished,
    hasPhotos: r.hasPhotos,
    mainImageUrl: r.mainImageUrl,
    mediaUrls: r.mediaUrls,
    sourceCount: r.sourceCount,
    savedCount: r.savedCount,
    publishedAt: r.publishedAt?.toISOString() ?? null,
    primaryChannel: channelMap.get(r.id) ?? null,
  }));

  // Build next cursor from the last item using the active sort key
  const last = slice[slice.length - 1];
  let nextCursor: string | null = null;
  if (hasMore && last) {
    const key = (() => {
      switch (q.sort) {
        case "price_asc":
        case "price_desc":
          return last.price ?? "0";
        case "most_saved":
          return last.savedCount;
        case "newest":
        default:
          return last.publishedAt?.toISOString() ?? "";
      }
    })();
    nextCursor = encodeCursor(key, last.id);
  }

  return { items, nextCursor, sort: q.sort };
}

/**
 * Single listing detail. Includes:
 *   - all real-estate fields as columns
 *   - category
 *   - source-group: ALL channels (and Telegram post URLs) where this
 *     listing appeared, sorted by published_at — used by the
 *     ListingSourcesPanel
 */
export async function fetchListingById(id: string) {
  const [row] = await db
    .select({
      listing: listings,
      category: categories,
    })
    .from(listings)
    .leftJoin(categories, eq(listings.categoryId, categories.id))
    .where(and(eq(listings.id, id), hasActiveSourceChannel))
    .limit(1);

  if (!row) return null;

  const sources = await db
    .select({
      id: listingSources.id,
      originalPostUrl: listingSources.originalPostUrl,
      publishedAt: listingSources.publishedAt,
      channelId: telegramChannels.id,
      channelUsername: telegramChannels.username,
      channelTitle: telegramChannels.title,
      channelUrl: telegramChannels.url,
    })
    .from(listingSources)
    .innerJoin(
      telegramChannels,
      eq(telegramChannels.id, listingSources.telegramChannelId),
    )
    .where(eq(listingSources.listingId, id))
    .orderBy(asc(listingSources.publishedAt));

  const primarySource = sources[0] ?? null;
  const additionalSources = sources.slice(1);

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
    category: row.category
      ? {
          id: row.category.id,
          slug: row.category.slug,
          name: row.category.name,
        }
      : null,
    primarySource: primarySource
      ? {
          channelId: primarySource.channelId,
          channelUsername: primarySource.channelUsername,
          channelTitle: primarySource.channelTitle,
          channelUrl: primarySource.channelUrl,
          originalPostUrl: primarySource.originalPostUrl,
          publishedAt: primarySource.publishedAt.toISOString(),
        }
      : null,
    additionalSources: additionalSources.map((s) => ({
      channelId: s.channelId,
      channelUsername: s.channelUsername,
      channelTitle: s.channelTitle,
      channelUrl: s.channelUrl,
      originalPostUrl: s.originalPostUrl,
      publishedAt: s.publishedAt.toISOString(),
    })),
  };
}

/**
 * Distinct values for the FiltersDrawer dropdowns. Cached per request.
 */
export async function fetchListingFacets() {
  // Facets must match the feed — only show values from listings the user
  // could actually find (active listing AND at least one active source).
  const [cities, districts, channels, currencies] = await Promise.all([
    db
      .selectDistinct({ city: listings.city })
      .from(listings)
      .where(
        and(
          eq(listings.status, "active"),
          hasActiveSourceChannel,
          sql`${listings.city} is not null`,
        ),
      )
      .orderBy(asc(listings.city)),
    db
      .selectDistinct({ district: listings.district })
      .from(listings)
      .where(
        and(
          eq(listings.status, "active"),
          hasActiveSourceChannel,
          sql`${listings.district} is not null`,
        ),
      )
      .orderBy(asc(listings.district)),
    db
      .select({
        username: telegramChannels.username,
        title: telegramChannels.title,
      })
      .from(telegramChannels)
      .where(eq(telegramChannels.status, "active"))
      .orderBy(asc(telegramChannels.title)),
    db
      .selectDistinct({ currency: listings.currency })
      .from(listings)
      .where(
        and(
          eq(listings.status, "active"),
          hasActiveSourceChannel,
          sql`${listings.currency} is not null`,
        ),
      )
      .orderBy(asc(listings.currency)),
  ]);

  return {
    cities: cities.map((c) => c.city!).filter(Boolean),
    districts: districts.map((d) => d.district!).filter(Boolean),
    channels,
    currencies: currencies.map((c) => c.currency!).filter(Boolean),
  };
}

export type ListingDetail = NonNullable<
  Awaited<ReturnType<typeof fetchListingById>>
>;
