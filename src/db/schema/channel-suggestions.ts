import { relations } from "drizzle-orm";
import {
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { categories } from "./categories";
import { channelSuggestionStatusEnum } from "./enums";
import { userProfiles } from "./user-profiles";

/**
 * User-submitted suggestion for a Telegram channel to ingest.
 *
 * Flow:
 *   1. Logged-in user submits via /suggest-channel (Phase 7)
 *   2. Admin reviews via /admin/channel-suggestions (Phase 8)
 *   3. On approval, admin creates a `telegram_channels` row and marks
 *      this suggestion approved
 */
export const channelSuggestions = pgTable(
  "channel_suggestions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => userProfiles.id, { onDelete: "cascade" }),
    channelUrl: text("channel_url").notNull(),
    channelUsername: text("channel_username"),
    suggestedCategoryId: uuid("suggested_category_id").references(
      () => categories.id,
      { onDelete: "set null" },
    ),
    suggestedCity: text("suggested_city"),
    note: text("note"),
    status: channelSuggestionStatusEnum("status")
      .notNull()
      .default("pending"),
    adminNote: text("admin_note"),
    reviewedByAdminId: uuid("reviewed_by_admin_id").references(
      () => userProfiles.id,
      { onDelete: "set null" },
    ),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("channel_suggestions_status_idx").on(table.status),
    index("channel_suggestions_user_idx").on(table.userId),
  ],
);

export const channelSuggestionsRelations = relations(
  channelSuggestions,
  ({ one }) => ({
    user: one(userProfiles, {
      fields: [channelSuggestions.userId],
      references: [userProfiles.id],
      relationName: "suggestion_submitter",
    }),
    suggestedCategory: one(categories, {
      fields: [channelSuggestions.suggestedCategoryId],
      references: [categories.id],
    }),
    reviewedByAdmin: one(userProfiles, {
      fields: [channelSuggestions.reviewedByAdminId],
      references: [userProfiles.id],
      relationName: "suggestion_reviewer",
    }),
  }),
);

export type ChannelSuggestion = typeof channelSuggestions.$inferSelect;
export type NewChannelSuggestion = typeof channelSuggestions.$inferInsert;
