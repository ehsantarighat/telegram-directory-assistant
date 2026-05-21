import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import {
  contentModeEnum,
  userPlanEnum,
  userRoleEnum,
} from "./enums";

/**
 * App-level profile data. One row per authenticated user.
 *
 * `id` matches `auth.users.id` (Supabase manages the auth schema). Email,
 * password, sessions and OAuth identities live in `auth.users` — we do
 * NOT mirror them here. This table holds only fields Supabase doesn't
 * give us: display name, language preferences, role, and plan.
 *
 * The link to `auth.users` is enforced by a Supabase trigger added in
 * Phase 5 (Auth). Drizzle does not foreign-key into the auth schema
 * because the auth schema is not under our migration control.
 */
export const userProfiles = pgTable("user_profiles", {
  id: uuid("id").primaryKey(),
  name: text("name"),
  preferredLanguage: text("preferred_language").notNull().default("en"),
  preferredContentMode: contentModeEnum("preferred_content_mode")
    .notNull()
    .default("original"),
  role: userRoleEnum("role").notNull().default("user"),
  plan: userPlanEnum("plan").notNull().default("free"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;
