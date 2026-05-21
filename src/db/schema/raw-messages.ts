import { relations, sql } from "drizzle-orm";
import {
  bigint,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { channels } from "./channels";
import { ingestionStateEnum } from "./enums";

export const rawMessages = pgTable(
  "raw_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    externalMessageId: bigint("external_message_id", {
      mode: "number",
    }).notNull(),
    postedAt: timestamp("posted_at", { withTimezone: true }).notNull(),
    text: text("text"),
    mediaUrls: jsonb("media_urls")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    rawPayload: jsonb("raw_payload")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    state: ingestionStateEnum("state").notNull().default("pending"),
    errorMessage: text("error_message"),
    ingestedAt: timestamp("ingested_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("raw_messages_channel_external_unique").on(
      table.channelId,
      table.externalMessageId,
    ),
    index("raw_messages_posted_at_idx").on(table.postedAt),
    index("raw_messages_state_idx").on(table.state),
  ],
);

export const rawMessagesRelations = relations(rawMessages, ({ one }) => ({
  channel: one(channels, {
    fields: [rawMessages.channelId],
    references: [channels.id],
  }),
}));

export type RawMessage = typeof rawMessages.$inferSelect;
export type NewRawMessage = typeof rawMessages.$inferInsert;
