"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { userProfiles } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/requireUser";

import {
  countAdmins,
  findUserByEmail,
  isUserAdmin,
} from "./team-queries";

const promoteSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email"),
});

const demoteSchema = z.object({
  userId: z.string().uuid(),
});

export type PromoteState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
  message?: string;
};

export type DemoteState = {
  error?: string;
  ok?: boolean;
};

async function revalidateTeam() {
  revalidatePath("/admin");
  revalidatePath("/admin/team");
}

/**
 * Promote an existing auth user to admin by email.
 *
 * Guards:
 *   - Email must correspond to an existing auth.users row (we don't
 *     create accounts here)
 *   - If they're already admin, we surface a friendly message rather
 *     than silently no-op
 */
export async function promoteToAdminAction(
  _prev: PromoteState,
  formData: FormData,
): Promise<PromoteState> {
  await requireAdmin();

  const parsed = promoteSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path[0]?.toString();
      if (k && !fieldErrors[k]) fieldErrors[k] = issue.message;
    }
    return { fieldErrors };
  }

  const found = await findUserByEmail(parsed.data.email);
  if (!found) {
    return {
      fieldErrors: {
        email:
          "No account with that email. The user must sign up before being promoted.",
      },
    };
  }

  if (await isUserAdmin(found.id)) {
    return {
      ok: true,
      message: `${found.email} is already an admin.`,
    };
  }

  await db
    .update(userProfiles)
    .set({ role: "admin", updatedAt: new Date() })
    .where(eq(userProfiles.id, found.id));

  await revalidateTeam();
  return { ok: true, message: `${found.email} is now an admin.` };
}

/**
 * Demote an admin back to a regular user.
 *
 * Guards:
 *   - Caller cannot demote themselves (UX safety: blocking self-lockout)
 *   - We refuse to demote the last admin (count check)
 */
export async function demoteAdminAction(
  _prev: DemoteState,
  formData: FormData,
): Promise<DemoteState> {
  const { user } = await requireAdmin();

  const parsed = demoteSchema.safeParse({ userId: formData.get("userId") });
  if (!parsed.success) return { error: "Invalid request" };

  if (parsed.data.userId === user.id) {
    return { error: "You can't demote yourself. Ask another admin to do it." };
  }

  const adminCount = await countAdmins();
  if (adminCount <= 1) {
    return { error: "Can't demote the last admin — promote a replacement first." };
  }

  const stillAdmin = await isUserAdmin(parsed.data.userId);
  if (!stillAdmin) {
    return { error: "That user is no longer an admin." };
  }

  await db
    .update(userProfiles)
    .set({ role: "user", updatedAt: new Date() })
    .where(eq(userProfiles.id, parsed.data.userId));

  await revalidateTeam();
  return { ok: true };
}
