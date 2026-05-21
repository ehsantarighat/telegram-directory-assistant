"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  channelSuggestions,
  telegramChannels,
} from "@/db/schema";
import { requireAdmin } from "@/lib/auth/requireUser";

const reviewSchema = z.object({
  suggestionId: z.string().uuid(),
  decision: z.enum(["approved", "rejected", "duplicate"]),
  adminNote: z
    .string()
    .trim()
    .max(500)
    .transform((s) => s || null)
    .nullable()
    .optional(),
});

export type SuggestionReviewState = {
  error?: string;
  ok?: boolean;
};

/**
 * Approve / reject / duplicate-mark a channel suggestion.
 *
 * On "approved", inserts a matching `telegram_channels` row with
 * status='active' so ingestion can start picking it up. Idempotent:
 * if a channel with the same username already exists, we skip the
 * insert and just mark the suggestion approved.
 *
 * All three decisions stamp reviewed_by_admin_id + reviewed_at +
 * admin_note for the audit trail (master spec).
 */
export async function reviewSuggestionAction(
  _prev: SuggestionReviewState,
  formData: FormData,
): Promise<SuggestionReviewState> {
  const { user } = await requireAdmin();

  const parsed = reviewSchema.safeParse({
    suggestionId: formData.get("suggestionId"),
    decision: formData.get("decision"),
    adminNote: formData.get("adminNote") ?? "",
  });
  if (!parsed.success) {
    return { error: "Invalid request" };
  }

  const [suggestion] = await db
    .select()
    .from(channelSuggestions)
    .where(eq(channelSuggestions.id, parsed.data.suggestionId))
    .limit(1);
  if (!suggestion) return { error: "Suggestion not found" };

  if (
    parsed.data.decision === "approved" &&
    suggestion.channelUsername &&
    suggestion.suggestedCategoryId
  ) {
    // Idempotent insert: skip if channel already exists by username.
    const [existing] = await db
      .select({ id: telegramChannels.id })
      .from(telegramChannels)
      .where(eq(telegramChannels.username, suggestion.channelUsername))
      .limit(1);
    if (!existing) {
      await db.insert(telegramChannels).values({
        title: suggestion.channelUsername,
        username: suggestion.channelUsername,
        url: suggestion.channelUrl,
        categoryId: suggestion.suggestedCategoryId,
        country: "Uzbekistan",
        city: suggestion.suggestedCity ?? null,
        status: "active",
        addedByAdminId: user.id,
      });
    }
  }

  await db
    .update(channelSuggestions)
    .set({
      status: parsed.data.decision,
      adminNote: parsed.data.adminNote ?? null,
      reviewedByAdminId: user.id,
      reviewedAt: new Date(),
    })
    .where(eq(channelSuggestions.id, parsed.data.suggestionId));

  revalidatePath("/admin");
  revalidatePath("/admin/channel-suggestions");
  revalidatePath("/admin/channels");
  revalidatePath("/suggest-channel");

  return { ok: true };
}
