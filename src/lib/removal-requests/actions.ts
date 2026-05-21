"use server";

import { revalidatePath } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  listingSources,
  listings,
  removalRequests,
} from "@/db/schema";

const schema = z.object({
  listingId: z.string().uuid(),
  requesterName: z.string().trim().min(1, "Required").max(120),
  requesterEmail: z.string().trim().toLowerCase().email("Invalid email"),
  requesterType: z.enum(["user", "channel_owner", "other"]),
  reason: z.string().trim().min(10, "Please describe the issue").max(500),
  note: z
    .string()
    .trim()
    .max(500)
    .transform((s) => s || null)
    .nullable()
    .optional(),
  // Optional: requester can declare which channel they're reporting via.
  // If absent and the listing has a primary source, we attach that channel.
  telegramChannelId: z
    .string()
    .uuid()
    .optional()
    .or(z.literal("")),
});

export type RemovalSubmitState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
};

/**
 * Submit a removal / report request. No auth required — anyone who can
 * see a listing can report it (master spec). The form fields include the
 * requester's identity for the audit trail.
 *
 * If the listing has a primary source channel and the form didn't
 * include a channel id, we auto-attach the primary one so the admin
 * can act on either or both targets.
 */
export async function submitRemovalRequestAction(
  _prev: RemovalSubmitState,
  formData: FormData,
): Promise<RemovalSubmitState> {
  const parsed = schema.safeParse({
    listingId: formData.get("listingId"),
    requesterName: formData.get("requesterName"),
    requesterEmail: formData.get("requesterEmail"),
    requesterType: formData.get("requesterType"),
    reason: formData.get("reason"),
    note: formData.get("note") ?? "",
    telegramChannelId: formData.get("telegramChannelId") ?? "",
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path[0]?.toString();
      if (k && !fieldErrors[k]) fieldErrors[k] = issue.message;
    }
    return { fieldErrors };
  }

  // Confirm the listing exists (we don't strictly need this, but a 404
  // listing turning into a phantom request is worse than rejecting up
  // front).
  const [listing] = await db
    .select({ id: listings.id })
    .from(listings)
    .where(eq(listings.id, parsed.data.listingId))
    .limit(1);
  if (!listing) {
    return { error: "Listing not found." };
  }

  // Resolve a channel id to attach.
  let channelId: string | null =
    parsed.data.telegramChannelId && parsed.data.telegramChannelId.length > 0
      ? parsed.data.telegramChannelId
      : null;
  if (!channelId) {
    const [primarySource] = await db
      .select({ channelId: listingSources.telegramChannelId })
      .from(listingSources)
      .where(eq(listingSources.listingId, parsed.data.listingId))
      .orderBy(asc(listingSources.publishedAt))
      .limit(1);
    channelId = primarySource?.channelId ?? null;
  }

  await db.insert(removalRequests).values({
    requesterName: parsed.data.requesterName,
    requesterEmail: parsed.data.requesterEmail,
    requesterType: parsed.data.requesterType,
    telegramChannelId: channelId,
    listingId: parsed.data.listingId,
    reason: parsed.data.reason,
    note: parsed.data.note ?? null,
    status: "pending",
  });

  revalidatePath("/admin");
  revalidatePath("/admin/removal-requests");
  revalidatePath(`/listings/${parsed.data.listingId}`);

  return {
    ok: true,
  };
}
