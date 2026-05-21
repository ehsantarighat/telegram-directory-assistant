import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  categories,
  channels,
  listings,
  rawMessages,
} from "@/db/schema";
import { UZS_PER_USD } from "@/db/seed-data/listings";
import { RealEstateExtractor } from "./extract/real-estate";
import type { ExtractedListing } from "./extract/types";
import type { IngestionRawMessage, IngestionSource } from "./types";

const extractors = {
  "real-estate": new RealEstateExtractor(),
} as const;

/**
 * Source-agnostic ingestion pipeline. Wired into a Source implementation
 * (mock now, real Telegram in Phase 4).
 *
 *   pipeline.ingestChannel({ source, channelUsername })
 *     -> source.fetchMessages()
 *     -> for each: upsert raw_messages, run extractor, upsert listing
 *     -> stamp channels.last_ingested_at
 *
 * Idempotent: rerunning over the same messages is a no-op via the
 * (channel_id, external_message_id) unique constraint on raw_messages
 * and the dedup_hash check on listings.
 */
export async function ingestChannel(opts: {
  source: IngestionSource;
  channelUsername: string;
  limit?: number;
}): Promise<{ fetched: number; inserted: number; skipped: number }> {
  const [channel] = await db
    .select()
    .from(channels)
    .where(eq(channels.username, opts.channelUsername))
    .limit(1);
  if (!channel) {
    throw new Error(`Unknown channel: ${opts.channelUsername}`);
  }

  // Pick the extractor based on the channel's category. For Phase 1 the
  // mock channels are tagged as the real-estate root category. Future
  // verticals add their own extractor here.
  const [cat] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, channel.categoryId))
    .limit(1);
  const extractorKey = (cat?.slug ?? "").split("-")[0] === "real"
    ? "real-estate"
    : null;
  const extractor = extractorKey ? extractors[extractorKey] : null;
  if (!extractor) {
    throw new Error(
      `No extractor wired for category ${cat?.slug ?? "(none)"} on channel ${channel.username}`,
    );
  }

  const messages = await opts.source.fetchMessages({
    channelUsername: opts.channelUsername,
    since: channel.lastIngestedAt ?? undefined,
    limit: opts.limit,
  });

  let inserted = 0;
  let skipped = 0;
  let lastSeenAt = channel.lastIngestedAt ?? null;

  for (const msg of messages) {
    const rawRow = await upsertRawMessage(channel.id, msg);
    const extracted = extractor.extract({
      text: msg.text,
      mediaUrls: msg.mediaUrls,
    });
    if (!extracted) {
      await db
        .update(rawMessages)
        .set({ state: "skipped" })
        .where(eq(rawMessages.id, rawRow.id));
      skipped += 1;
      continue;
    }

    const wasInserted = await upsertListing({
      channelId: channel.id,
      rawMessageId: rawRow.id,
      categoryId: cat!.id,
      countryId: channel.countryId,
      postedAt: msg.postedAt,
      telegramUrl: `https://t.me/${channel.username}/${msg.externalId}`,
      mediaUrls: msg.mediaUrls,
      extracted,
    });

    if (wasInserted) inserted += 1;
    else skipped += 1;

    if (!lastSeenAt || msg.postedAt > lastSeenAt) lastSeenAt = msg.postedAt;
  }

  if (lastSeenAt) {
    await db
      .update(channels)
      .set({ lastIngestedAt: lastSeenAt })
      .where(eq(channels.id, channel.id));
  }

  return { fetched: messages.length, inserted, skipped };
}

async function upsertRawMessage(
  channelId: string,
  msg: IngestionRawMessage,
) {
  const [row] = await db
    .insert(rawMessages)
    .values({
      channelId,
      externalMessageId: msg.externalId,
      postedAt: msg.postedAt,
      text: msg.text,
      mediaUrls: msg.mediaUrls,
      rawPayload: msg.raw,
      state: "pending",
    })
    .onConflictDoUpdate({
      target: [rawMessages.channelId, rawMessages.externalMessageId],
      set: {
        text: msg.text,
        mediaUrls: msg.mediaUrls,
        rawPayload: msg.raw,
      },
    })
    .returning();
  return row;
}

async function upsertListing(input: {
  channelId: string;
  rawMessageId: string;
  categoryId: string;
  countryId: string;
  postedAt: Date;
  telegramUrl: string;
  mediaUrls: string[];
  extracted: ExtractedListing;
}): Promise<boolean> {
  const { extracted } = input;
  const dedupSource = [
    input.channelId,
    extracted.listingType,
    extracted.title,
    extracted.priceUzs ?? "",
    extracted.contactPhones.join(","),
  ].join("|");
  const dedupHash = createHash("sha256")
    .update(dedupSource)
    .digest("hex")
    .slice(0, 32);

  // If a listing with this dedup_hash already exists, treat as duplicate.
  const existing = await db
    .select({ id: listings.id })
    .from(listings)
    .where(
      and(eq(listings.channelId, input.channelId), eq(listings.dedupHash, dedupHash)),
    )
    .limit(1);
  if (existing.length > 0) {
    await db
      .update(rawMessages)
      .set({ state: "extracted" })
      .where(eq(rawMessages.id, input.rawMessageId));
    return false;
  }

  await db.insert(listings).values({
    rawMessageId: input.rawMessageId,
    channelId: input.channelId,
    categoryId: input.categoryId,
    listingType: extracted.listingType,
    countryId: input.countryId,
    price: extracted.priceUzs?.toString() ?? null,
    currency: extracted.currency,
    priceUsd:
      extracted.priceUzs != null
        ? (extracted.priceUzs / UZS_PER_USD).toFixed(2)
        : null,
    title: extracted.title,
    description: extracted.description,
    language: extracted.language ?? null,
    contactPhones: extracted.contactPhones,
    telegramUrl: input.telegramUrl,
    mediaUrls: input.mediaUrls,
    attributes: extracted.attributes,
    status: "active",
    postedAt: input.postedAt,
    dedupHash,
  });

  await db
    .update(rawMessages)
    .set({ state: "extracted" })
    .where(eq(rawMessages.id, input.rawMessageId));

  return true;
}

