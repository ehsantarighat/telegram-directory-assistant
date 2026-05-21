import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { categories } from "./categories";
import { notificationChannelEnum } from "./enums";
import { userProfiles } from "./user-profiles";

/**
 * Future-ready saved search + alert config.
 *
 * Phase 11 ships only the data model and a UI placeholder ("alerts
 * coming soon"). No background job runs in MVP. When alerts ship, a
 * matcher walks new listings against `filters_json` and dispatches via
 * `notification_channel`.
 *
 * `filters_json` mirrors the validated query schema used by
 * /api/listings so the same code path can re-run a saved search.
 */
export const savedSearches = pgTable(
  "saved_searches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => userProfiles.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    filtersJson: jsonb("filters_json")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    alertsEnabled: boolean("alerts_enabled").notNull().default(false),
    notificationChannel: notificationChannelEnum("notification_channel"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("saved_searches_user_idx").on(table.userId)],
);

export const savedSearchesRelations = relations(savedSearches, ({ one }) => ({
  user: one(userProfiles, {
    fields: [savedSearches.userId],
    references: [userProfiles.id],
  }),
  category: one(categories, {
    fields: [savedSearches.categoryId],
    references: [categories.id],
  }),
}));

export type SavedSearch = typeof savedSearches.$inferSelect;
export type NewSavedSearch = typeof savedSearches.$inferInsert;
