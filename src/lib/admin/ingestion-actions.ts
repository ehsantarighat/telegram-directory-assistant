"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { telegramChannels } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/requireUser";
import { ingestChannel, type IngestResult } from "@/lib/ingestion/pipeline";
import { TelegramWebSource } from "@/lib/ingestion/telegram-web";

const schema = z.object({
  channelId: z.string().uuid(),
});

export type SyncActionState =
  | { ok: true; result: IngestResult; channelUsername: string }
  | { ok: false; error: string };

/**
 * Admin "Run sync" entry point. Wraps the source-agnostic ingestChannel
 * pipeline with the live TelegramWebSource (scrapes the channel's public
 * t.me/s/<username> page).
 *
 * Bounds: at most the last 100 posts, never older than 6 months. Both
 * limits enforced inside TelegramWebSource. Subsequent runs honour the
 * stored last_synced_at watermark, so re-syncs only pick up new posts.
 *
 * Stamps lastSyncStatus + lastSyncError on failure so the admin channels
 * table renders the latest run's outcome inline.
 */
export async function runSyncAction(
  formData: FormData,
): Promise<SyncActionState> {
  await requireAdmin();

  const parsed = schema.safeParse({ channelId: formData.get("channelId") });
  if (!parsed.success) return { ok: false, error: "Invalid request" };

  return runChannelSync(parsed.data.channelId);
}

/** Back-compat alias for any existing callsites still using the old name. */
export const runMockSyncAction = runSyncAction;

/**
 * Internal helper used by both the admin "Run sync" button and the
 * channel-add flow. Returns the same SyncActionState shape.
 */
export async function runChannelSync(
  channelId: string,
  opts: { maxPosts?: number; maxAgeDays?: number } = {},
): Promise<SyncActionState> {
  const [channel] = await db
    .select({
      id: telegramChannels.id,
      username: telegramChannels.username,
      status: telegramChannels.status,
    })
    .from(telegramChannels)
    .where(eq(telegramChannels.id, channelId))
    .limit(1);

  if (!channel) return { ok: false, error: "Channel not found" };
  if (channel.status !== "active") {
    return {
      ok: false,
      error: `Channel is ${channel.status}. Set it back to active first.`,
    };
  }

  const source = new TelegramWebSource({
    maxPosts: opts.maxPosts ?? 100,
    maxAgeDays: opts.maxAgeDays ?? 183,
  });

  try {
    const result = await ingestChannel({
      source,
      channelUsername: channel.username,
      limit: opts.maxPosts ?? 100,
    });

    revalidatePath("/admin");
    revalidatePath("/admin/channels");
    revalidatePath("/admin/listings");
    revalidatePath("/listings");
    revalidatePath("/");

    return { ok: true, result, channelUsername: channel.username };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";

    await db
      .update(telegramChannels)
      .set({
        lastSyncStatus: "error",
        lastSyncError: message.slice(0, 200),
        updatedAt: new Date(),
      })
      .where(eq(telegramChannels.id, channel.id));

    revalidatePath("/admin/channels");
    return { ok: false, error: message };
  }
}
