import { pgEnum } from "drizzle-orm/pg-core";

/**
 * Listing type — what kind of transaction this listing is for.
 * Maps to the three MVP top-level filters (Rent / Sale / Daily).
 */
export const listingTypeEnum = pgEnum("listing_type", [
  "rent",
  "sale",
  "daily_rent",
]);

/**
 * Property type — physical type of real estate.
 * Drives the property-type filter in the listings UI.
 */
export const propertyTypeEnum = pgEnum("property_type", [
  "apartment",
  "house",
  "commercial",
  "land",
  "room",
  "studio",
]);

/**
 * Listing lifecycle.
 *   active      — visible in feed
 *   hidden      — admin hid it
 *   removed     — admin / removal_request removed it
 *   duplicate   — folded into another listing (look at duplicate_group_id)
 *   incomplete  — extraction failed to find enough fields
 */
export const listingStatusEnum = pgEnum("listing_status", [
  "active",
  "hidden",
  "removed",
  "duplicate",
  "incomplete",
]);

/** Telegram channel lifecycle. */
export const channelStatusEnum = pgEnum("channel_status", [
  "active",
  "disabled",
  "removed",
  "pending",
]);

/** User-submitted channel suggestion lifecycle. */
export const channelSuggestionStatusEnum = pgEnum(
  "channel_suggestion_status",
  ["pending", "approved", "rejected", "duplicate"],
);

/** Removal request lifecycle. */
export const removalRequestStatusEnum = pgEnum("removal_request_status", [
  "pending",
  "approved",
  "rejected",
  "resolved",
]);

/** Who is requesting a takedown. */
export const removalRequesterTypeEnum = pgEnum("removal_requester_type", [
  "user",
  "channel_owner",
  "other",
]);

/** Raw Telegram post processing lifecycle. */
export const rawPostProcessingStatusEnum = pgEnum(
  "raw_post_processing_status",
  ["pending", "processed", "failed", "ignored"],
);

/** App-level role. Admin is checked server-side, never from the client. */
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

/** Account plan. MVP is free for everyone; column reserved for future tiers. */
export const userPlanEnum = pgEnum("user_plan", ["free", "paid"]);

/** Whether the user prefers original or translated content. */
export const contentModeEnum = pgEnum("content_mode", [
  "original",
  "translated",
]);

/** Text direction for a translation (Persian uses rtl). */
export const translationDirectionEnum = pgEnum("translation_direction", [
  "ltr",
  "rtl",
]);

/** Future alert delivery channel — reserved for Phase 11+. */
export const notificationChannelEnum = pgEnum("notification_channel", [
  "email",
  "telegram_bot",
  "web_push",
  "whatsapp",
]);

/** Listing category status. */
export const categoryStatusEnum = pgEnum("category_status", [
  "active",
  "inactive",
]);
