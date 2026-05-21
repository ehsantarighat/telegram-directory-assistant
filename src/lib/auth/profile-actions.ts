"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { userProfiles } from "@/db/schema";
import { requireUser } from "@/lib/auth/requireUser";

const profileSchema = z.object({
  name: z.string().trim().min(1).max(80).optional().or(z.literal("")),
  preferredLanguage: z.enum(["en", "ru", "uz", "fa"]),
  preferredContentMode: z.enum(["original", "translated"]),
});

export type ProfileFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
};

export async function updateProfileAction(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const { user } = await requireUser();

  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    preferredLanguage: formData.get("preferredLanguage"),
    preferredContentMode: formData.get("preferredContentMode"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path[0]?.toString();
      if (k && !fieldErrors[k]) fieldErrors[k] = issue.message;
    }
    return { fieldErrors };
  }

  await db
    .update(userProfiles)
    .set({
      name: parsed.data.name?.trim() || null,
      preferredLanguage: parsed.data.preferredLanguage,
      preferredContentMode: parsed.data.preferredContentMode,
      updatedAt: new Date(),
    })
    .where(eq(userProfiles.id, user.id));

  revalidatePath("/profile");
  return { ok: true };
}
