import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Mirrors auth.users (Supabase). One row per authenticated user, holding
 * app-level profile fields. The `id` matches Supabase's `auth.users.id`.
 *
 * We do not foreign-key to auth.users at the Drizzle layer because the
 * auth schema is owned by Supabase. Integrity is enforced by the
 * Supabase trigger / RLS policy added later in Phase 3.
 */
export const userProfiles = pgTable("user_profiles", {
  id: uuid("id").primaryKey(),
  displayName: text("display_name"),
  preferredLanguage: text("preferred_language").notNull().default("en"),
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
