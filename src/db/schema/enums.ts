import { pgEnum } from "drizzle-orm/pg-core";

export const listingTypeEnum = pgEnum("listing_type", [
  "rent",
  "sale",
  "daily",
]);

export const listingStatusEnum = pgEnum("listing_status", [
  "active",
  "expired",
  "duplicate",
  "hidden",
]);

export const locationKindEnum = pgEnum("location_kind", [
  "country",
  "region",
  "city",
  "district",
]);

export const channelKindEnum = pgEnum("channel_kind", [
  "telegram",
]);

export const ingestionStateEnum = pgEnum("ingestion_state", [
  "pending",
  "extracted",
  "failed",
  "skipped",
]);
