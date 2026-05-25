"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  categories,
  channelSuggestions,
  telegramChannels,
} from "@/db/schema";
import { requireUser } from "@/lib/auth/requireUser";

import { normalizeTelegramChannel } from "./normalize";

const schema = z.object({
  channelInput: z.string().trim().min(1, "Required").max(200),
  categoryId: z.string().uuid("Pick a category"),
  city: z
    .string()
    .trim()
    .max(80)
    .transform((s) => s || null)
    .nullable()
    .optional(),
  note: z
    .string()
    .trim()
    .max(500)
    .transform((s) => s || null)
    .nullable()
    .optional(),
});

export type SuggestionFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
  message?: string;
};

export async function suggestChannelAction(
  _prev: SuggestionFormState,
  formData: FormData,
): Promise<SuggestionFormState> {
  const { user } = await requireUser("/suggest-channel");

  const parsed = schema.safeParse({
    channelInput: formData.get("channelInput"),
    categoryId: formData.get("categoryId"),
    city: formData.get("city"),
    note: formData.get("note"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path[0]?.toString();
      if (k && !fieldErrors[k]) fieldErrors[k] = issue.message;
    }
    return { fieldErrors };
  }

  // 1) Normalize and validate the channel URL/username
  const normalized = normalizeTelegramChannel(parsed.data.channelInput);
  if (!normalized) {
    return {
      fieldErrors: {
        channelInput:
          "Couldn't read a Telegram channel handle. Try @username or https://t.me/username",
      },
    };
  }

  // 2) Confirm the category exists and is active
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
  if (!cat) {
    return { fieldErrors: { categoryId: "Unknown category" } };
  }

  // 3) Decide whether the channel already exists in telegram_channels.
  //
  // We branch on `status` because the old code rejected ANY row by
  // username — including `removed` channels (admin took them out) and
  // `disabled` ones (admin paused them). That meant every user
  // suggesting a previously-removed channel got the misleading
  // "already in our directory" error, even though the channel is NOT
  // in the directory anymore. Now:
  //
  //   - active     → genuinely in the directory; reject the suggestion
  //                  (with a positive, non-scary message)
  //   - pending    → admin is processing it; tell user to wait
  //   - disabled   → admin paused it (rate-limit, broken, etc.); tell
  //                  user it's known but currently off
  //   - removed    → admin deliberately removed it; ALLOW the
  //                  suggestion through so the admin sees the demand
  //                  signal and can decide whether to resurrect via
  //                  the existing upsert-channel resurrect path
  //   - (no row)   → allow normally
  const [existingChannel] = await db
    .select({
      id: telegramChannels.id,
      status: telegramChannels.status,
    })
    .from(telegramChannels)
    .where(eq(telegramChannels.username, normalized.username))
    .limit(1);

  if (existingChannel && existingChannel.status !== "removed") {
    if (existingChannel.status === "active") {
      return {
        ok: true,
        message: `@${normalized.username} is already in our directory — go to /listings to browse it.`,
      };
    }
    if (existingChannel.status === "pending") {
      return {
        ok: true,
        message: `@${normalized.username} is already being added by an admin — give it a few minutes and refresh /listings.`,
      };
    }
    // disabled
    return {
      ok: true,
      message: `@${normalized.username} is known but currently paused by an admin. We've noted your interest.`,
    };
  }

  // 4) Inform (don't reject) if THIS user already submitted a pending
  // suggestion for the same channel. Treat the duplicate as a no-op
  // success — re-submitting is a common confused-user action, and
  // pretending it failed adds friction without protecting anything.
  const [duplicatePending] = await db
    .select({ id: channelSuggestions.id })
    .from(channelSuggestions)
    .where(
      and(
        eq(channelSuggestions.userId, user.id),
        eq(channelSuggestions.channelUsername, normalized.username),
        eq(channelSuggestions.status, "pending"),
      ),
    )
    .limit(1);
  if (duplicatePending) {
    return {
      ok: true,
      message: `@${normalized.username} is already in your review queue — admins will get to it.`,
    };
  }

  // 5) Insert
  await db.insert(channelSuggestions).values({
    userId: user.id,
    channelUrl: normalized.url,
    channelUsername: normalized.username,
    suggestedCategoryId: parsed.data.categoryId,
    suggestedCity: parsed.data.city ?? null,
    note: parsed.data.note ?? null,
    status: "pending",
  });

  revalidatePath("/suggest-channel");
  revalidatePath("/admin/channel-suggestions");

  return {
    ok: true,
    message: `Thanks — @${normalized.username} is in the review queue.`,
  };
}
