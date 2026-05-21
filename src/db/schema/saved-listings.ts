import { relations } from "drizzle-orm";
import {
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { listings } from "./listings";
import { userProfiles } from "./user-profiles";

/**
 * User bookmarks. Save / unsave is wrapped in a transaction in Phase 5
 * that also increments / decrements `listings.saved_count` so the card
 * UI can show counts without joining.
 */
export const savedListings = pgTable(
  "saved_listings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => userProfiles.id, { onDelete: "cascade" }),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("saved_listings_user_listing_unique").on(
      table.userId,
      table.listingId,
    ),
    index("saved_listings_user_created_idx").on(
      table.userId,
      table.createdAt,
    ),
  ],
);

export const savedListingsRelations = relations(savedListings, ({ one }) => ({
  user: one(userProfiles, {
    fields: [savedListings.userId],
    references: [userProfiles.id],
  }),
  listing: one(listings, {
    fields: [savedListings.listingId],
    references: [listings.id],
  }),
}));

export type SavedListing = typeof savedListings.$inferSelect;
export type NewSavedListing = typeof savedListings.$inferInsert;
