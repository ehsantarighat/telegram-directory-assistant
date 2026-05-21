import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { categoryStatusEnum } from "./enums";

/**
 * Top-level content categories.
 *
 * MVP seeds a single "Real Estate" row. Architecture allows future
 * verticals (Cars, Jobs, Services, etc.) without schema changes — each
 * vertical gets a category row and the listings table is joined by
 * category_id.
 */
export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  status: categoryStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
