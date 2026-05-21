import { relations } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { categories } from "./categories";
import { channelKindEnum } from "./enums";
import { countries } from "./countries";

export const channels = pgTable(
  "channels",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    kind: channelKindEnum("kind").notNull().default("telegram"),
    // Telegram numeric channel id (nullable until we resolve it)
    externalId: bigint("external_id", { mode: "number" }),
    username: text("username").notNull().unique(),
    title: text("title").notNull(),
    description: text("description"),
    avatarUrl: text("avatar_url"),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    countryId: uuid("country_id")
      .notNull()
      .references(() => countries.id, { onDelete: "restrict" }),
    isActive: boolean("is_active").notNull().default(true),
    lastIngestedAt: timestamp("last_ingested_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("channels_category_idx").on(table.categoryId),
    index("channels_country_idx").on(table.countryId),
  ],
);

export const channelsRelations = relations(channels, ({ one }) => ({
  category: one(categories, {
    fields: [channels.categoryId],
    references: [categories.id],
  }),
  country: one(countries, {
    fields: [channels.countryId],
    references: [countries.id],
  }),
}));

export type Channel = typeof channels.$inferSelect;
export type NewChannel = typeof channels.$inferInsert;
