import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { rawPostProcessingStatusEnum } from "./enums";
import { telegramChannels } from "./telegram-channels";

/**
 * Immutable record of a single original Telegram channel message.
 *
 * Source of truth for everything downstream. The extractor reads from
 * this table and produces `listings` rows. We keep `original_text` and
 * `raw_payload_json` even after processing so we can re-extract with a
 * better model later.
 */
export const rawTelegramPosts = pgTable(
  "raw_telegram_posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    telegramChannelId: uuid("telegram_channel_id")
      .notNull()
      .references(() => telegramChannels.id, { onDelete: "cascade" }),
    telegramMessageId: bigint("telegram_message_id", {
      mode: "number",
    }).notNull(),
    originalPostUrl: text("original_post_url").notNull(),
    originalText: text("original_text"),
    detectedLanguage: text("detected_language"),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    importedAt: timestamp("imported_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    hasMedia: boolean("has_media").notNull().default(false),
    mediaMetadata: jsonb("media_metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    rawPayloadJson: jsonb("raw_payload_json")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    processingStatus: rawPostProcessingStatusEnum("processing_status")
      .notNull()
      .default("pending"),
    processingError: text("processing_error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("raw_telegram_posts_channel_message_unique").on(
      table.telegramChannelId,
      table.telegramMessageId,
    ),
    index("raw_telegram_posts_published_idx").on(table.publishedAt),
    index("raw_telegram_posts_processing_status_idx").on(
      table.processingStatus,
    ),
  ],
);

export const rawTelegramPostsRelations = relations(
  rawTelegramPosts,
  ({ one }) => ({
    channel: one(telegramChannels, {
      fields: [rawTelegramPosts.telegramChannelId],
      references: [telegramChannels.id],
    }),
  }),
);

export type RawTelegramPost = typeof rawTelegramPosts.$inferSelect;
export type NewRawTelegramPost = typeof rawTelegramPosts.$inferInsert;
