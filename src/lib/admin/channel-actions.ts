"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { categories, telegramChannels } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/requireUser";
import { normalizeTelegramChannel } from "@/lib/channel-suggestions/normalize";

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(120),
  channelInput: z.string().trim().min(1).max(200),
  categoryId: z.string().uuid(),
  country: z.string().trim().max(80).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  language: z.string().trim().max(8).optional().or(z.literal("")),
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

  // Username collision check (excluding the row being edited)
  const collision = await db
    .select({ id: telegramChannels.id })
    .from(telegramChannels)
    .where(
      and(
        eq(telegramChannels.username, normalized.username),
        parsed.data.id
          ? ne(telegramChannels.id, parsed.data.id)
          : undefined,
      ),
    )
    .limit(1);
  if (collision.length > 0) {
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
        updatedAt: new Date(),
      })
      .where(eq(telegramChannels.id, parsed.data.id));
  } else {
    await db.insert(telegramChannels).values({
      title: parsed.data.title,
      username: normalized.username,
      url: normalized.url,
      categoryId: parsed.data.categoryId,
      country: parsed.data.country || null,
      city: parsed.data.city || null,
      language: parsed.data.language || null,
      status: "active",
    });
  }

  await revalidate();
  return { ok: true };
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
