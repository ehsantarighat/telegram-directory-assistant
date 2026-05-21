import { relations } from "drizzle-orm";
import {
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { listings } from "./listings";
import {
  removalRequestStatusEnum,
  removalRequesterTypeEnum,
} from "./enums";
import { telegramChannels } from "./telegram-channels";

/**
 * Takedown / report queue.
 *
 * Anyone can submit (no login required) from a listing detail page in
 * Phase 9. Admin reviews via /admin/removal-requests in Phase 8. On
 * approval the linked listing or channel is moved to `removed` status.
 *
 * Requests may reference a listing, a channel, or both — for example a
 * channel owner asking that an entire channel stop being ingested.
 */
export const removalRequests = pgTable(
  "removal_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requesterName: text("requester_name").notNull(),
    requesterEmail: text("requester_email").notNull(),
    requesterType: removalRequesterTypeEnum("requester_type").notNull(),
    telegramChannelId: uuid("telegram_channel_id").references(
      () => telegramChannels.id,
      { onDelete: "set null" },
    ),
    listingId: uuid("listing_id").references(() => listings.id, {
      onDelete: "set null",
    }),
    reason: text("reason").notNull(),
    note: text("note"),
    status: removalRequestStatusEnum("status").notNull().default("pending"),
    adminNote: text("admin_note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("removal_requests_status_idx").on(table.status),
    index("removal_requests_listing_idx").on(table.listingId),
    index("removal_requests_channel_idx").on(table.telegramChannelId),
  ],
);

export const removalRequestsRelations = relations(
  removalRequests,
  ({ one }) => ({
    channel: one(telegramChannels, {
      fields: [removalRequests.telegramChannelId],
      references: [telegramChannels.id],
    }),
    listing: one(listings, {
      fields: [removalRequests.listingId],
      references: [listings.id],
    }),
  }),
);

export type RemovalRequest = typeof removalRequests.$inferSelect;
export type NewRemovalRequest = typeof removalRequests.$inferInsert;
