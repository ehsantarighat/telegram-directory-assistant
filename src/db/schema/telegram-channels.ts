import { relations } from "drizzle-orm";
import {
  bigint,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { categories } from "./categories";
import { channelStatusEnum } from "./enums";
import { userProfiles } from "./user-profiles";

/**
 * Telegram channels the platform ingests from.
 *
 * MVP rows are added manually by admins via the admin panel. User
 * suggestions live in `channel_suggestions` and are converted into rows
 * here on admin approval.
 *
 * Ingestion-status fields (`last_synced_at`, `last_sync_status`,
 * `last_sync_error`, `posts_imported_count`) are written by the future
 * Telegram worker (Phase 10 mock, real worker post-MVP).
 */
export const telegramChannels = pgTable(
  "telegram_channels",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    username: text("username").notNull().unique(),
    url: text("url").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    country: text("country"),
    city: text("city"),
    language: text("language"),
    status: channelStatusEnum("status").notNull().default("active"),
    addedByAdminId: uuid("added_by_admin_id").references(
      () => userProfiles.id,
      { onDelete: "set null" },
    ),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    lastSyncStatus: text("last_sync_status"),
    lastSyncError: text("last_sync_error"),
    /**
     * Auto-sync cadence in minutes. The cron tick picks channels where
     *   now() >= last_synced_at + sync_interval_minutes
     * (or where last_synced_at is null — first sync). Defaults to 60.
     * Set lower for high-volume channels (e.g. 15) and higher for slow
     * ones (e.g. 360 = 6h). Set to 0 to disable auto-sync for a channel
     * (manual sync still works).
     */
    syncIntervalMinutes: integer("sync_interval_minutes")
      .notNull()
      .default(60),
    postsImportedCount: bigint("posts_imported_count", { mode: "number" })
      .notNull()
      .default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("telegram_channels_category_idx").on(table.categoryId),
    index("telegram_channels_status_idx").on(table.status),
    index("telegram_channels_city_idx").on(table.city),
  ],
);

export const telegramChannelsRelations = relations(
  telegramChannels,
  ({ one }) => ({
    category: one(categories, {
      fields: [telegramChannels.categoryId],
      references: [categories.id],
    }),
    addedByAdmin: one(userProfiles, {
      fields: [telegramChannels.addedByAdminId],
      references: [userProfiles.id],
    }),
  }),
);

export type TelegramChannel = typeof telegramChannels.$inferSelect;
export type NewTelegramChannel = typeof telegramChannels.$inferInsert;
