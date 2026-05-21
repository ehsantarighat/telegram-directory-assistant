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
import { userProfiles } from "./user-profiles";

/**
 * Persisted search criteria a user can re-run, optionally notifying them
 * when new matching listings appear (notification worker arrives in Phase 4).
 *
 * `query` mirrors the validated /api/listings query schema so the same code
 * path can re-execute a saved search.
 */
export const savedSearches = pgTable(
  "saved_searches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => userProfiles.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    query: jsonb("query")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    notifyEnabled: boolean("notify_enabled").notNull().default(false),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
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
}));

export type SavedSearch = typeof savedSearches.$inferSelect;
export type NewSavedSearch = typeof savedSearches.$inferInsert;
