import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  categories,
  listingSources,
  listings,
  rawTelegramPosts,
  telegramChannels,
} from "@/db/schema";

import { RealEstateExtractor } from "./extract/real-estate";
import type { ExtractedListing } from "./extract/types";
import type { IngestionRawMessage, IngestionSource } from "./types";

const extractors = {
  "real-estate": new RealEstateExtractor(),
} as const;

/**
 * Source-agnostic ingestion pipeline.
 *
 *   ingestChannel({ source, channelUsername })
 *     → source.fetchMessages()
 *     → for each raw message:
 *         · upsert into raw_telegram_posts (channel_id + telegram_message_id unique)
 *         · run extractor
 *         · upsert into listings (and create a listing_sources row)
 *     → stamp telegram_channels.last_synced_at / posts_imported_count
 *
 * Idempotent — the unique index on (telegram_channel_id, telegram_message_id)
 * makes reruns safe. Listing-level deduplication via `duplicate_group_id`
 * is left for Phase 10 (mock sync); for now a single raw post produces a
 * single listing.
 */
export async function ingestChannel(opts: {
  source: IngestionSource;
  channelUsername: string;
  limit?: number;
}): Promise<{ fetched: number; inserted: number; skipped: number }> {
  const [channel] = await db
    .select()
    .from(telegramChannels)
    .where(eq(telegramChannels.username, opts.channelUsername))
    .limit(1);
  if (!channel) {
    throw new Error(`Unknown channel: ${opts.channelUsername}`);
  }

  const [cat] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, channel.categoryId))
    .limit(1);

  const extractorKey =
    cat?.slug === "real-estate" ? ("real-estate" as const) : null;
  const extractor = extractorKey ? extractors[extractorKey] : null;
  if (!extractor) {
    throw new Error(
      `No extractor wired for category ${cat?.slug ?? "(none)"} on channel ${channel.username}`,
    );
  }

  const messages = await opts.source.fetchMessages({
    channelUsername: opts.channelUsername,
    since: channel.lastSyncedAt ?? undefined,
    limit: opts.limit,
  });

  let inserted = 0;
  let skipped = 0;
  let lastSeenAt = channel.lastSyncedAt ?? null;

  for (const msg of messages) {
    const rawRow = await upsertRawPost(channel.id, msg);
    const extracted = extractor.extract({
      text: msg.text,
      mediaUrls: msg.mediaUrls,
    });
    if (!extracted) {
      await db
        .update(rawTelegramPosts)
        .set({ processingStatus: "ignored" })
        .where(eq(rawTelegramPosts.id, rawRow.id));
      skipped += 1;
      continue;
    }

    const wasInserted = await upsertListing({
      channelId: channel.id,
      rawPostId: rawRow.id,
      categoryId: cat!.id,
      publishedAt: msg.postedAt,
      originalPostUrl: `https://t.me/${channel.username}/${msg.externalId}`,
      mediaUrls: msg.mediaUrls,
      extracted,
    });

    if (wasInserted) inserted += 1;
    else skipped += 1;

    if (!lastSeenAt || msg.postedAt > lastSeenAt) lastSeenAt = msg.postedAt;
  }

  if (lastSeenAt) {
    await db
      .update(telegramChannels)
      .set({
        lastSyncedAt: lastSeenAt,
        lastSyncStatus: "ok",
        postsImportedCount: channel.postsImportedCount + inserted,
      })
      .where(eq(telegramChannels.id, channel.id));
  }

  return { fetched: messages.length, inserted, skipped };
}

async function upsertRawPost(channelId: string, msg: IngestionRawMessage) {
  const [row] = await db
    .insert(rawTelegramPosts)
    .values({
      telegramChannelId: channelId,
      telegramMessageId: msg.externalId,
      originalPostUrl: msg.raw.url as string | undefined ??
        `https://t.me/${msg.source}/${msg.externalId}`,
      originalText: msg.text,
      publishedAt: msg.postedAt,
      hasMedia: msg.mediaUrls.length > 0,
      mediaMetadata: { urls: msg.mediaUrls },
      rawPayloadJson: msg.raw,
      processingStatus: "pending",
    })
    .onConflictDoUpdate({
      target: [
        rawTelegramPosts.telegramChannelId,
        rawTelegramPosts.telegramMessageId,
      ],
      set: {
        originalText: msg.text,
        rawPayloadJson: msg.raw,
        mediaMetadata: { urls: msg.mediaUrls },
        hasMedia: msg.mediaUrls.length > 0,
      },
    })
    .returning();
  return row;
}

async function upsertListing(input: {
  channelId: string;
  rawPostId: string;
  categoryId: string;
  publishedAt: Date;
  originalPostUrl: string;
  mediaUrls: string[];
  extracted: ExtractedListing;
}): Promise<boolean> {
  const { extracted } = input;

  // Phase 2: every successfully-extracted message yields one listing.
  // Phase 10 (mock sync) will add a dedup pre-check using
  // (normalized title + price + contact) before inserting.
  const existing = await db
    .select({ id: listings.id })
    .from(listings)
    .where(
      and(
        eq(listings.primaryRawPostId, input.rawPostId),
        eq(listings.status, "active"),
      ),
    )
    .limit(1);
  if (existing.length > 0) {
    await db
      .update(rawTelegramPosts)
      .set({ processingStatus: "processed" })
      .where(eq(rawTelegramPosts.id, input.rawPostId));
    return false;
  }

  const [listingRow] = await db
    .insert(listings)
    .values({
      categoryId: input.categoryId,
      primaryRawPostId: input.rawPostId,
      listingType: extracted.listingType,
      propertyType: extracted.propertyType ?? null,
      title: extracted.title,
      summary: extracted.summary ?? null,
      originalText: extracted.originalText ?? null,
      detectedLanguage: extracted.language ?? null,
      country: extracted.country ?? null,
      city: extracted.city ?? null,
      district: extracted.district ?? null,
      neighborhood: extracted.neighborhood ?? null,
      price: extracted.price?.toString() ?? null,
      currency: extracted.currency ?? null,
      rooms: extracted.rooms ?? null,
      areaSqm: extracted.areaSqm?.toString() ?? null,
      floor: extracted.floor ?? null,
      totalFloors: extracted.totalFloors ?? null,
      furnished: extracted.furnished ?? null,
      contactPhone: extracted.contactPhones[0] ?? null,
      hasPhotos: input.mediaUrls.length > 0,
      mainImageUrl: input.mediaUrls[0] ?? null,
      mediaUrls: input.mediaUrls,
      sourceCount: 1,
      publishedAt: input.publishedAt,
      status: "active",
    })
    .returning();

  await db.insert(listingSources).values({
    listingId: listingRow.id,
    rawTelegramPostId: input.rawPostId,
    telegramChannelId: input.channelId,
    originalPostUrl: input.originalPostUrl,
    publishedAt: input.publishedAt,
  });

  await db
    .update(rawTelegramPosts)
    .set({ processingStatus: "processed" })
    .where(eq(rawTelegramPosts.id, input.rawPostId));

  return true;
}
