"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  listings,
  removalRequests,
  telegramChannels,
} from "@/db/schema";
import { requireAdmin } from "@/lib/auth/requireUser";

const reviewSchema = z.object({
  removalId: z.string().uuid(),
  decision: z.enum(["approved", "rejected", "resolved"]),
  adminNote: z
    .string()
    .trim()
    .max(500)
    .transform((s) => s || null)
    .nullable()
    .optional(),
});

export type RemovalReviewState = {
  error?: string;
  ok?: boolean;
};

/**
 * Review a removal request.
 *
 * On "approved":
 *   - If the request references a listing, mark that listing as
 *     status='removed' so it leaves the public feed.
 *   - If the request references a channel, mark that channel as
 *     status='removed' so future syncs stop importing from it.
 *   - Both can be present; we handle them independently.
 *
 * "rejected" and "resolved" are status-only updates; "resolved" is for
 * cases where the issue was handled out-of-band (e.g., reporter
 * withdrew or the listing aged out naturally).
 *
 * Either way we stamp admin_note and bump updated_at.
 */
export async function reviewRemovalRequestAction(
  _prev: RemovalReviewState,
  formData: FormData,
): Promise<RemovalReviewState> {
  await requireAdmin();

  const parsed = reviewSchema.safeParse({
    removalId: formData.get("removalId"),
    decision: formData.get("decision"),
    adminNote: formData.get("adminNote") ?? "",
  });
  if (!parsed.success) return { error: "Invalid request" };

  const [req] = await db
    .select()
    .from(removalRequests)
    .where(eq(removalRequests.id, parsed.data.removalId))
    .limit(1);
  if (!req) return { error: "Request not found" };

  if (parsed.data.decision === "approved") {
    if (req.listingId) {
      await db
        .update(listings)
        .set({ status: "removed", updatedAt: new Date() })
        .where(eq(listings.id, req.listingId));
    }
    if (req.telegramChannelId) {
      await db
        .update(telegramChannels)
        .set({ status: "removed", updatedAt: new Date() })
        .where(eq(telegramChannels.id, req.telegramChannelId));
    }
  }

  await db
    .update(removalRequests)
    .set({
      status: parsed.data.decision,
      adminNote: parsed.data.adminNote ?? null,
      updatedAt: new Date(),
    })
    .where(eq(removalRequests.id, parsed.data.removalId));

  revalidatePath("/admin");
  revalidatePath("/admin/removal-requests");
  if (req.listingId) {
    revalidatePath("/admin/listings");
    revalidatePath(`/listings/${req.listingId}`);
    revalidatePath("/listings");
  }
  if (req.telegramChannelId) {
    revalidatePath("/admin/channels");
  }

  return { ok: true };
}
