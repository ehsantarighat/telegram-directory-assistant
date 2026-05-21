import { relations } from "drizzle-orm";
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { listings } from "./listings";
import { rawTelegramPosts } from "./raw-telegram-posts";
import { telegramChannels } from "./telegram-channels";

/**
 * Many-to-many link between a `listings` row and the `raw_telegram_posts`
 * that produced it.
 *
 * A single real-world listing posted to multiple channels yields one
 * `listings` row plus N `listing_sources` rows (one per channel). The UI
 * uses this to render "also posted in" channel chips on the detail page
 * and the duplicate-source count on cards.
 *
 * `original_post_url` is denormalized here so the source panel doesn't
 * need a second join to `raw_telegram_posts` for rendering.
 */
export const listingSources = pgTable(
  "listing_sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    rawTelegramPostId: uuid("raw_telegram_post_id")
      .notNull()
      .references(() => rawTelegramPosts.id, { onDelete: "cascade" }),
    telegramChannelId: uuid("telegram_channel_id")
      .notNull()
      .references(() => telegramChannels.id, { onDelete: "cascade" }),
    originalPostUrl: text("original_post_url").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("listing_sources_listing_raw_unique").on(
      table.listingId,
      table.rawTelegramPostId,
    ),
    index("listing_sources_listing_idx").on(table.listingId),
    index("listing_sources_channel_idx").on(table.telegramChannelId),
  ],
);

export const listingSourcesRelations = relations(
  listingSources,
  ({ one }) => ({
    listing: one(listings, {
      fields: [listingSources.listingId],
      references: [listings.id],
    }),
    rawTelegramPost: one(rawTelegramPosts, {
      fields: [listingSources.rawTelegramPostId],
      references: [rawTelegramPosts.id],
    }),
    channel: one(telegramChannels, {
      fields: [listingSources.telegramChannelId],
      references: [telegramChannels.id],
    }),
  }),
);

export type ListingSource = typeof listingSources.$inferSelect;
export type NewListingSource = typeof listingSources.$inferInsert;
