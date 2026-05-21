import { relations } from "drizzle-orm";
import {
  AnyPgColumn,
  doublePrecision,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { countries } from "./countries";
import { locationKindEnum } from "./enums";

export const locations = pgTable(
  "locations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    countryId: uuid("country_id")
      .notNull()
      .references(() => countries.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id").references((): AnyPgColumn => locations.id, {
      onDelete: "set null",
    }),
    kind: locationKindEnum("kind").notNull(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    nameLocal: text("name_local"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("locations_country_slug_unique").on(
      table.countryId,
      table.slug,
    ),
    index("locations_parent_idx").on(table.parentId),
    index("locations_kind_idx").on(table.kind),
  ],
);

export const locationsRelations = relations(locations, ({ one, many }) => ({
  country: one(countries, {
    fields: [locations.countryId],
    references: [countries.id],
  }),
  parent: one(locations, {
    fields: [locations.parentId],
    references: [locations.id],
    relationName: "location_parent",
  }),
  children: many(locations, { relationName: "location_parent" }),
}));

export type Location = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;
