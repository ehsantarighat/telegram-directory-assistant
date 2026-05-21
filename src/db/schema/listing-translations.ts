import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { listings } from "./listings";
import { translationDirectionEnum } from "./enums";

/**
 * On-demand cached translations per listing × language.
 *
 * Phase 6 flow:
 *   1. User requests a translated language for a listing
 *   2. App checks for a (listing_id, language) row here
 *   3. If miss → call the (mock-now, real-later) translation provider,
 *      then insert here
 *   4. UI renders translated_title / translated_summary / translated_text
 *      with the cached row's `direction` (rtl for fa)
 *
 * The `provider` column lets us mix mock and real providers during the
 * transition and audit which rows were machine vs LLM translated.
 */
export const listingTranslations = pgTable(
  "listing_translations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    language: text("language").notNull(),
    translatedTitle: text("translated_title"),
    translatedSummary: text("translated_summary"),
    translatedText: text("translated_text"),
    direction: translationDirectionEnum("direction").notNull().default("ltr"),
    provider: text("provider").notNull().default("mock"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("listing_translations_listing_language_unique").on(
      table.listingId,
      table.language,
    ),
  ],
);

export const listingTranslationsRelations = relations(
  listingTranslations,
  ({ one }) => ({
    listing: one(listings, {
      fields: [listingTranslations.listingId],
      references: [listings.id],
    }),
  }),
);

export type ListingTranslation = typeof listingTranslations.$inferSelect;
export type NewListingTranslation = typeof listingTranslations.$inferInsert;
