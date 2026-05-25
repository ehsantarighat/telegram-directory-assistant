"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { categories, telegramChannels } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/requireUser";
import { normalizeTelegramChannel } from "@/lib/channel-suggestions/normalize";
import { runChannelSync } from "@/lib/admin/ingestion-actions";

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(120),
  channelInput: z.string().trim().min(1).max(200),
  categoryId: z.string().uuid(),
  country: z.string().trim().max(80).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  language: z.string().trim().max(8).optional().or(z.literal("")),
  // Auto-sync cadence. 0 = disabled, max 10080 = 1 week. Coerce because
  // FormData entries arrive as strings.
  syncIntervalMinutes: z.coerce.number().int().min(0).max(10080).default(60),
});

export type ChannelFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
};

async function revalidate() {
  revalidatePath("/admin");
  revalidatePath("/admin/channels");
  revalidatePath("/listings");
  revalidatePath("/");
}

/**
 * Add or update a Telegram channel. Used by the admin Channels page.
 * `id` present → update; absent → insert.
 */
export async function upsertChannelAction(
  _prev: ChannelFormState,
  formData: FormData,
): Promise<ChannelFormState> {
  await requireAdmin();

  const parsed = upsertSchema.safeParse({
    id: formData.get("id")?.toString() || undefined,
    title: formData.get("title"),
    channelInput: formData.get("channelInput"),
    categoryId: formData.get("categoryId"),
    country: formData.get("country") ?? "",
    city: formData.get("city") ?? "",
    language: formData.get("language") ?? "",
    syncIntervalMinutes: formData.get("syncIntervalMinutes") ?? 60,
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path[0]?.toString();
      if (k && !fieldErrors[k]) fieldErrors[k] = issue.message;
    }
    return { fieldErrors };
  }

  const normalized = normalizeTelegramChannel(parsed.data.channelInput);
  if (!normalized) {
    return {
      fieldErrors: {
        channelInput: "Use @username or https://t.me/username",
      },
    };
  }

  // Category must be active
  const [cat] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(
      and(
        eq(categories.id, parsed.data.categoryId),
        eq(categories.status, "active"),
      ),
    )
    .limit(1);
  if (!cat) return { fieldErrors: { categoryId: "Unknown category" } };

  // Username collision check (excluding the row being edited).
  // The `username` column has a unique constraint at the DB level, so
  // we look up the existing row by username and decide what to do:
  //   - editing this row → ignore (will be updated below)
  //   - existing row is 'removed' → resurrect it (flip back to active,
  //     update fields, re-run backfill). The admin set it to 'removed'
  //     and now wants it back; this is the natural undo.
  //   - existing row is 'active' or 'disabled' → reject as duplicate.
  const [existing] = await db
    .select({
      id: telegramChannels.id,
      status: telegramChannels.status,
    })
    .from(telegramChannels)
    .where(eq(telegramChannels.username, normalized.username))
    .limit(1);

  if (existing && existing.id !== parsed.data.id) {
    if (existing.status === "removed") {
      await db
        .update(telegramChannels)
        .set({
          title: parsed.data.title,
          url: normalized.url,
          categoryId: parsed.data.categoryId,
          country: parsed.data.country || null,
          city: parsed.data.city || null,
          language: parsed.data.language || null,
          syncIntervalMinutes: parsed.data.syncIntervalMinutes,
          status: "active",
          lastSyncStatus: "running",
          lastSyncError: null,
          updatedAt: new Date(),
        })
        .where(eq(telegramChannels.id, existing.id));
      await revalidate();
      scheduleBackfill(existing.id, normalized.username);
      return { ok: true };
    }
    return {
      fieldErrors: {
        channelInput: `@${normalized.username} already exists`,
      },
    };
  }

  if (parsed.data.id) {
    await db
      .update(telegramChannels)
      .set({
        title: parsed.data.title,
        username: normalized.username,
        url: normalized.url,
        categoryId: parsed.data.categoryId,
        country: parsed.data.country || null,
        city: parsed.data.city || null,
        language: parsed.data.language || null,
        syncIntervalMinutes: parsed.data.syncIntervalMinutes,
        updatedAt: new Date(),
      })
      .where(eq(telegramChannels.id, parsed.data.id));
    await revalidate();
    return { ok: true };
  }

  // Insert path → kick off an initial backfill (last 6 months / 100 posts)
  // so the channel shows up on the feed without an extra click. The sync
  // hits the LLM for every new post (~3s each), so a full backfill can
  // take minutes — we must NOT make the admin wait for that.
  //
  // Strategy:
  //   1) Insert the row with lastSyncStatus='running' so the admin
  //      channels table immediately shows "Syncing…" next to it.
  //   2) Return success to the form so the dialog closes.
  //   3) Use Next.js `after()` to run the actual sync after the response
  //      is committed. Errors are caught and stamped on the row so the
  //      admin sees them on next refresh.
  const [inserted] = await db
    .insert(telegramChannels)
    .values({
      title: parsed.data.title,
      username: normalized.username,
      url: normalized.url,
      categoryId: parsed.data.categoryId,
      country: parsed.data.country || null,
      city: parsed.data.city || null,
      language: parsed.data.language || null,
      syncIntervalMinutes: parsed.data.syncIntervalMinutes,
      status: "active",
      lastSyncStatus: "running",
    })
    .returning({ id: telegramChannels.id });

  await revalidate();

  if (inserted) {
    scheduleBackfill(inserted.id, normalized.username);
  }

  return { ok: true };
}

/**
 * Schedule the initial backfill to run AFTER this server action's
 * response is committed. Used by both the insert path (new channel)
 * and the resurrect path (re-adding a previously removed channel).
 *
 * Errors inside the callback are caught — they don't break the form
 * response, and the row's lastSyncStatus + lastSyncError are stamped
 * by runChannelSync so the admin sees them on next refresh.
 */
function scheduleBackfill(channelId: string, username: string): void {
  after(async () => {
    try {
      // Smaller initial backfill (30 posts ≈ 90s at 3s/post) so the
      // admin sees content quickly. They can hit "Run sync" again
      // to pull more posts whenever they want.
      await runChannelSync(channelId, { maxPosts: 30, maxAgeDays: 183 });
      console.log(
        `[channel-actions] background backfill complete for @${username}`,
      );
    } catch (err) {
      console.warn(
        `[channel-actions] background backfill failed for @${username}:`,
        err,
      );
    }
    // Revalidate now that the sync is done so admins (and the public
    // feed) see the freshly-imported listings on next request.
    revalidatePath("/admin");
    revalidatePath("/admin/channels");
    revalidatePath("/admin/listings");
    revalidatePath("/listings");
    revalidatePath("/");
  });
}

const statusSchema = z.object({
  channelId: z.string().uuid(),
  status: z.enum(["active", "disabled", "removed"]),
});

export async function setChannelStatusAction(formData: FormData) {
  await requireAdmin();
  const parsed = statusSchema.safeParse({
    channelId: formData.get("channelId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  await db
    .update(telegramChannels)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(eq(telegramChannels.id, parsed.data.channelId));

  await revalidate();
}
