import { relations, sql } from "drizzle-orm";
import {
  bigint,
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { categories } from "./categories";
import { channels } from "./channels";
import { countries } from "./countries";
import { listingStatusEnum, listingTypeEnum } from "./enums";
import { locations } from "./locations";
import { rawMessages } from "./raw-messages";

/**
 * Listings are the canonical, extracted, query-able units.
 *
 * Common fields (price, location, contact) live as columns.
 * Category-specific fields (rooms, area_sqm, mileage, etc.) live in
 * `attributes` JSONB. This keeps the table category-agnostic while staying
 * fast to query — a GIN index on attributes powers ad-hoc filters per
 * vertical (real estate now; cars/jobs later).
 */
export const listings = pgTable(
  "listings",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    // Provenance
    rawMessageId: uuid("raw_message_id").references(() => rawMessages.id, {
      onDelete: "set null",
    }),
    channelId: uuid("channel_id").references(() => channels.id, {
      onDelete: "set null",
    }),

    // Taxonomy
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    listingType: listingTypeEnum("listing_type").notNull(),

    // Geography
    countryId: uuid("country_id")
      .notNull()
      .references(() => countries.id, { onDelete: "restrict" }),
    cityId: uuid("city_id").references(() => locations.id, {
      onDelete: "set null",
    }),
    districtId: uuid("district_id").references(() => locations.id, {
      onDelete: "set null",
    }),

    // Money
    price: numeric("price", { precision: 14, scale: 2 }),
    currency: text("currency"),
    // Normalized price in USD for cross-currency comparison/sort.
    // Stored numeric so we can sort/filter cheaply.
    priceUsd: numeric("price_usd", { precision: 14, scale: 2 }),

    // Display
    title: text("title").notNull(),
    description: text("description").notNull(),
    language: text("language"),

    // Contact + source
    contactPhones: jsonb("contact_phones")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    telegramUrl: text("telegram_url"),
    mediaUrls: jsonb("media_urls")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),

    // Category-specific structured fields (rooms, area_sqm, floor, ...).
    attributes: jsonb("attributes")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),

    // Lifecycle
    status: listingStatusEnum("status").notNull().default("active"),
    postedAt: timestamp("posted_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    // Dedup signature (hash of normalized text + price + contact).
    // Used by ingestion pipeline to suppress duplicates across channels.
    dedupHash: text("dedup_hash"),

    // Soft-stat counters maintained by app or triggers later.
    viewCount: bigint("view_count", { mode: "number" }).notNull().default(0),
  },
  (table) => [
    // Primary filter path: type + country + posted_at desc
    index("listings_type_country_posted_idx").on(
      table.listingType,
      table.countryId,
      table.postedAt,
    ),
    index("listings_city_posted_idx").on(table.cityId, table.postedAt),
    index("listings_district_idx").on(table.districtId),
    index("listings_category_idx").on(table.categoryId),
    index("listings_status_idx").on(table.status),
    index("listings_price_usd_idx").on(table.priceUsd),
    index("listings_dedup_hash_idx").on(table.dedupHash),
    // GIN index for ad-hoc attribute queries (rooms, area_sqm, etc.)
    index("listings_attributes_gin_idx").using("gin", table.attributes),
  ],
);

export const listingsRelations = relations(listings, ({ one }) => ({
  category: one(categories, {
    fields: [listings.categoryId],
    references: [categories.id],
  }),
  channel: one(channels, {
    fields: [listings.channelId],
    references: [channels.id],
  }),
  rawMessage: one(rawMessages, {
    fields: [listings.rawMessageId],
    references: [rawMessages.id],
  }),
  country: one(countries, {
    fields: [listings.countryId],
    references: [countries.id],
  }),
  city: one(locations, {
    fields: [listings.cityId],
    references: [locations.id],
    relationName: "listing_city",
  }),
  district: one(locations, {
    fields: [listings.districtId],
    references: [locations.id],
    relationName: "listing_district",
  }),
}));

export type Listing = typeof listings.$inferSelect;
export type NewListing = typeof listings.$inferInsert;
