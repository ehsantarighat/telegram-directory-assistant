"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { savedSearches } from "@/db/schema";
import { requireUser } from "@/lib/auth/requireUser";
import { listingsQuerySchema } from "@/lib/listings/query";

const saveSchema = z.object({
  name: z.string().trim().min(1, "Name required").max(80),
  filtersJson: z.string().min(2),
});

const deleteSchema = z.object({
  searchId: z.string().uuid(),
});

export type SaveSearchState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
  message?: string;
};

/**
 * Persist a snapshot of the current listings filters under a name.
 *
 * `filters_json` is shape-validated against the same Zod schema the
 * /api/listings route uses, so when notifications ship in a later phase
 * the matcher can re-run the exact same query against new listings.
 *
 * `alerts_enabled` defaults to false. Phase 11 is data-model only —
 * there's no background matcher, no notification dispatch. The schema
 * is ready; the runtime isn't, by master-spec design.
 */
export async function saveSearchAction(
  _prev: SaveSearchState,
  formData: FormData,
): Promise<SaveSearchState> {
  const { user } = await requireUser("/listings");

  const parsed = saveSchema.safeParse({
    name: formData.get("name"),
    filtersJson: formData.get("filtersJson"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path[0]?.toString();
      if (k && !fieldErrors[k]) fieldErrors[k] = issue.message;
    }
    return { fieldErrors };
  }

  // Validate the filters JSON shape against the same schema the public
  // feed uses. Reject garbage early so we don't store unrunnable rows.
  let parsedFilters: Record<string, unknown>;
  try {
    parsedFilters = JSON.parse(parsed.data.filtersJson);
  } catch {
    return { error: "Invalid filter payload" };
  }
  const filterValidation = listingsQuerySchema.safeParse(parsedFilters);
  if (!filterValidation.success) {
    return {
      error: "Filter snapshot is invalid — refresh /listings and try again.",
    };
  }

  await db.insert(savedSearches).values({
    userId: user.id,
    name: parsed.data.name,
    // Strip cursor/limit so the saved search re-runs against fresh data
    // rather than re-fetching the same page.
    filtersJson: stripPaginationKeys(filterValidation.data),
    alertsEnabled: false,
  });

  revalidatePath("/profile");
  revalidatePath("/listings");

  return {
    ok: true,
    message: `Saved "${parsed.data.name}". Alerts will activate when notifications ship.`,
  };
}

export async function deleteSavedSearchAction(
  formData: FormData,
): Promise<void> {
  const { user } = await requireUser("/profile");
  const parsed = deleteSchema.safeParse({
    searchId: formData.get("searchId"),
  });
  if (!parsed.success) return;

  // Restrict to the caller's own searches — defense against id-spoofing.
  await db
    .delete(savedSearches)
    .where(
      and(
        eq(savedSearches.id, parsed.data.searchId),
        eq(savedSearches.userId, user.id),
      ),
    );

  revalidatePath("/profile");
}

function stripPaginationKeys<T extends Record<string, unknown>>(input: T): T {
  // The "cursor" key is meaningless on a re-run; "limit" is a UI choice.
  // We keep "sort" since it's part of the user's saved intent.
  const out: Record<string, unknown> = { ...input };
  delete out.cursor;
  delete out.limit;
  return out as T;
}
