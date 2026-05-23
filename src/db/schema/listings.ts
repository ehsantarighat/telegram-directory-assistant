import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { categories } from "./categories";
import {
  listingStatusEnum,
  listingTypeEnum,
  propertyTypeEnum,
} from "./enums";
import { rawTelegramPosts } from "./raw-telegram-posts";

/**
 * Canonical listing — the unit users search, filter, and save.
 *
 * Real-estate-specific fields are stored as top-level typed columns
 * (per master spec). When future verticals (cars, jobs) arrive, they
 * get their own table; this table stays real-estate-focused.
 *
 * `primary_raw_post_id` points to the raw post that originally produced
 * this listing. All raw posts that map to the same listing are stored
 * in `listing_sources` (many-to-many), enabling duplicate / source-group
 * display in the UI.
 *
 * `duplicate_group_id` groups listings the dedup logic decided are the
 * same real-world listing posted in multiple channels. UI shows the
 * canonical listing plus the count of duplicates.
 *
 * `extraction_confidence_json` is populated by the AI extractor (post-MVP)
 * with per-field confidence scores so admins can audit low-confidence
 * fields. Currently `{}`.
 */
export const listings = pgTable(
  "listings",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    // Taxonomy
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    primaryRawPostId: uuid("primary_raw_post_id").references(
      () => rawTelegramPosts.id,
      { onDelete: "set null" },
    ),

    // Listing classification
    listingType: listingTypeEnum("listing_type").notNull(),
    propertyType: propertyTypeEnum("property_type"),

    // Display
    title: text("title").notNull(),
    summary: text("summary"),
    originalText: text("original_text"),
    detectedLanguage: text("detected_language"),

    // Geography (free-form text per master spec; normalize at write time)
    country: text("country"),
    city: text("city"),
    district: text("district"),
    neighborhood: text("neighborhood"),

    // Money
    price: numeric("price", { precision: 14, scale: 2 }),
    currency: text("currency"),

    // Real estate specifics
    rooms: integer("rooms"),
    areaSqm: numeric("area_sqm", { precision: 10, scale: 2 }),
    floor: integer("floor"),
    totalFloors: integer("total_floors"),
    furnished: boolean("furnished"),
    newBuilding: boolean("new_building"),
    renovationStatus: text("renovation_status"),
    metroNearby: boolean("metro_nearby"),
    ownerOrAgent: text("owner_or_agent"),
    commission: text("commission"),
    parking: boolean("parking"),
    balcony: boolean("balcony"),
    elevator: boolean("elevator"),
    petsAllowed: boolean("pets_allowed"),
    heatingType: text("heating_type"),
    buildingMaterial: text("building_material"),

    // Contact
    contactPhone: text("contact_phone"),
    contactTelegram: text("contact_telegram"),

    // Media
    hasPhotos: boolean("has_photos").notNull().default(false),
    mainImageUrl: text("main_image_url"),
    mediaUrls: jsonb("media_urls")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),

    // Aggregates (denormalized, kept in sync at write time)
    sourceCount: integer("source_count").notNull().default(1),
    savedCount: bigint("saved_count", { mode: "number" })
      .notNull()
      .default(0),
    viewCount: bigint("view_count", { mode: "number" })
      .notNull()
      .default(0),
    duplicateGroupId: uuid("duplicate_group_id"),

    // Lifecycle
    publishedAt: timestamp("published_at", { withTimezone: true }),
    importedAt: timestamp("imported_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    status: listingStatusEnum("status").notNull().default("active"),

    // Forensics
    extractionConfidenceJson: jsonb("extraction_confidence_json")
      .$type<Record<string, number>>()
      .notNull()
      .default(sql`'{}'::jsonb`),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Primary search path: active + type + city ordered by recency
    index("listings_active_type_city_published_idx").on(
      table.status,
      table.listingType,
      table.city,
      table.publishedAt,
    ),
    // Secondary search path: active + type ordered by recency
    index("listings_active_type_published_idx").on(
      table.status,
      table.listingType,
      table.publishedAt,
    ),
    // Filters
    index("listings_category_idx").on(table.categoryId),
    index("listings_property_type_idx").on(table.propertyType),
    index("listings_district_idx").on(table.district),
    index("listings_price_idx").on(table.price),
    index("listings_rooms_idx").on(table.rooms),
    // Duplicate-group lookups
    index("listings_duplicate_group_idx").on(table.duplicateGroupId),
    // Cursor-pagination order key
    index("listings_published_at_idx").on(table.publishedAt),
  ],
);

export const listingsRelations = relations(listings, ({ one }) => ({
  category: one(categories, {
    fields: [listings.categoryId],
    references: [categories.id],
  }),
  primaryRawPost: one(rawTelegramPosts, {
    fields: [listings.primaryRawPostId],
    references: [rawTelegramPosts.id],
  }),
}));

export type Listing = typeof listings.$inferSelect;
export type NewListing = typeof listings.$inferInsert;
