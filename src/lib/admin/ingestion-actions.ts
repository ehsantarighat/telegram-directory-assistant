"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { telegramChannels } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/requireUser";
import { ingestChannel, type IngestResult } from "@/lib/ingestion/pipeline";
import { MockIngestionSource } from "@/lib/ingestion/mock";

const schema = z.object({
  channelId: z.string().uuid(),
});

export type SyncActionState =
  | { ok: true; result: IngestResult; channelUsername: string }
  | { ok: false; error: string };

/**
 * Admin "Run mock sync" entry point. Wraps the source-agnostic
 * ingestChannel pipeline with the MockIngestionSource.
 *
 * Replace MockIngestionSource with TelegramIngestionSource when the
 * real Telethon worker lands — the pipeline, dedup, and admin UI stay
 * exactly the same.
 *
 * Stamps lastSyncStatus + lastSyncError on failure so the admin
 * channels table can render the latest run's outcome inline.
 */
export async function runMockSyncAction(
  formData: FormData,
): Promise<SyncActionState> {
  await requireAdmin();

  const parsed = schema.safeParse({ channelId: formData.get("channelId") });
  if (!parsed.success) return { ok: false, error: "Invalid request" };

  const [channel] = await db
    .select({
      id: telegramChannels.id,
      username: telegramChannels.username,
      status: telegramChannels.status,
    })
    .from(telegramChannels)
    .where(eq(telegramChannels.id, parsed.data.channelId))
    .limit(1);

  if (!channel) return { ok: false, error: "Channel not found" };
  if (channel.status !== "active") {
    return {
      ok: false,
      error: `Channel is ${channel.status}. Set it back to active first.`,
    };
  }

  const source = new MockIngestionSource();

  try {
    const result = await ingestChannel({
      source,
      channelUsername: channel.username,
    });

    revalidatePath("/admin");
    revalidatePath("/admin/channels");
    revalidatePath("/admin/listings");
    revalidatePath("/listings");

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
