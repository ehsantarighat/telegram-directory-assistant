import { eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { userProfiles } from "@/db/schema";

export type AdminRow = {
  id: string;
  name: string | null;
  email: string;
  createdAt: Date;
};

/**
 * All current admins, joined with auth.users so the UI can show emails.
 *
 * Drizzle owns only the public schema; we touch auth.users via raw SQL
 * because Supabase manages it. Joining on user_profiles.id = auth.users.id
 * is the same FK relationship the handle_new_user trigger maintains.
 */
export async function fetchAdmins(): Promise<AdminRow[]> {
  const rows = await db.execute<{
    id: string;
    name: string | null;
    email: string;
    created_at: Date;
  }>(sql`
    select up.id, up.name, au.email, up.created_at
    from public.user_profiles up
    join auth.users au on au.id = up.id
    where up.role = 'admin'
    order by up.created_at asc
  `);

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    createdAt: r.created_at instanceof Date ? r.created_at : new Date(r.created_at),
  }));
}

/**
 * Look up an auth user by email (case-insensitive). Returns null if no
 * account with that email exists, so the promote action can surface a
 * field-level error.
 */
export async function findUserByEmail(
  email: string,
): Promise<{ id: string; email: string } | null> {
  const normalized = email.trim().toLowerCase();
  const rows = await db.execute<{ id: string; email: string }>(sql`
    select id, email from auth.users
    where lower(email) = ${normalized}
    limit 1
  `);
  return rows[0] ?? null;
}

/**
 * Returns true if the user already has role='admin', without exposing
 * the rest of the profile. Used to short-circuit duplicate promote
 * attempts.
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  const rows = await db
    .select({ role: userProfiles.role })
    .from(userProfiles)
    .where(eq(userProfiles.id, userId))
    .limit(1);
  return rows[0]?.role === "admin";
}

/**
 * How many admins exist right now. Used to guard against demoting the
 * last admin.
 */
export async function countAdmins(): Promise<number> {
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(userProfiles)
    .where(eq(userProfiles.role, "admin"));
  return rows[0]?.n ?? 0;
}

