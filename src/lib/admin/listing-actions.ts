"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { listings } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/requireUser";

const statusSchema = z.object({
  listingId: z.string().uuid(),
  status: z.enum(["active", "hidden", "removed"]),
});

/**
 * Flip a listing's status. Used by the admin Listings table.
 *   active   — back in the public feed
 *   hidden   — temporarily off-feed (e.g. quality issue, awaiting review)
 *   removed  — permanently off-feed (e.g. takedown approved)
 *
 * Master spec separately tracks `duplicate` and `incomplete` for the
 * ingestion pipeline; admins don't toggle those directly.
 */
export async function setListingStatusAction(formData: FormData) {
  await requireAdmin();
  const parsed = statusSchema.safeParse({
    listingId: formData.get("listingId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  await db
    .update(listings)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(eq(listings.id, parsed.data.listingId));

  revalidatePath("/admin");
  revalidatePath("/admin/listings");
  revalidatePath("/listings");
  revalidatePath(`/listings/${parsed.data.listingId}`);
}
