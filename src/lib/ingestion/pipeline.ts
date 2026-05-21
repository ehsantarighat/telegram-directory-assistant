import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  categories,
  listingSources,
  listings,
  rawTelegramPosts,
  telegramChannels,
} from "@/db/schema";

import { findDuplicate } from "./dedup";
import { CompositeRealEstateExtractor } from "./extract/composite";
import { tryGetLlmExtractor } from "./extract/llm";
import { RealEstateExtractor } from "./extract/real-estate";
import type { ExtractedListing, Extractor } from "./extract/types";
import type { IngestionRawMessage, IngestionSource } from "./types";

/**
 * Lazy per-category extractor cache. Built on first use so env access
 * (which the LLM extractor needs) happens at runtime, not module-load.
 */
const extractorCache = new Map<string, Extractor>();
function getExtractor(categorySlug: string): Extractor | null {
  const cached = extractorCache.get(categorySlug);
  if (cached) return cached;
  if (categorySlug === "real-estate") {
    const ext = new CompositeRealEstateExtractor(
      tryGetLlmExtractor(),
      new RealEstateExtractor(),
    );
    extractorCache.set(categorySlug, ext);
    return ext;
  }
  return null;
}

export type IngestResult = {
  fetched: number;
  inserted: number;
  duplicates: number;
  skipped: number;
};

/**
 * Source-agnostic ingestion pipeline.
 *
 *   ingestChannel({ source, channelUsername })
 *     → source.fetchMessages()
 *     → for each raw message:
 *         · upsert into raw_telegram_posts
 *         · run extractor (Phase 10: rule-based; later: AI hybrid)
 *         · dedup check (Phase 10: signature-match; later: image hash + LLM)
 *         · either attach to an existing canonical listing OR insert new
 *     → stamp telegram_channels.last_synced_at / posts_imported_count
 *
 * Idempotent — the unique index on (telegram_channel_id, telegram_message_id)
 * suppresses double-inserts on the raw post side, and the dedup service
 * suppresses near-duplicates on the listing side.
 */
export async function ingestChannel(opts: {
  source: IngestionSource;
  channelUsername: string;
  limit?: number;
}): Promise<IngestResult> {
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

  const extractor = cat?.slug ? getExtractor(cat.slug) : null;
  if (!extractor) {
    throw new Error(
      `No extractor wired for category ${cat?.slug ?? "(none)"} on channel ${channel.username}`,
    );
  }
  console.log(
    `[ingest] starting @${channel.username} using extractor=${extractor.name}`,
  );

  // The watermark for incremental fetches is the timestamp of the
  // newest raw post we've already stored — NOT channel.lastSyncedAt
  // (which now means "when sync last ran", a UX field, see below).
  // First-ever sync of a channel will find no rows and pass `undefined`,
  // which makes TelegramWebSource walk back the full 6mo / 100-post
  // window.
  const [latestRaw] = await db
    .select({ publishedAt: rawTelegramPosts.publishedAt })
    .from(rawTelegramPosts)
    .where(eq(rawTelegramPosts.telegramChannelId, channel.id))
    .orderBy(desc(rawTelegramPosts.publishedAt))
    .limit(1);
  const watermark = latestRaw?.publishedAt ?? undefined;

  const messages = await opts.source.fetchMessages({
    channelUsername: opts.channelUsername,
    since: watermark,
    limit: opts.limit,
  });

  // Pre-build the channel hint we pass to the LLM extractor. Embeds the
  // username and the human-readable title so the model can infer from
  // names like "@manorpremium_arenda" that the entire channel is rentals,
  // not sales.
  const channelContext = buildChannelContext(channel.username, channel.title);

  let inserted = 0;
  let duplicates = 0;
  let skipped = 0;

  for (const msg of messages) {
    const rawRow = await upsertRawPost(channel.id, msg);
    const extracted = await extractor.extract({
      text: msg.text,
      mediaUrls: msg.mediaUrls,
      channelContext,
    });
    if (!extracted) {
      await db
        .update(rawTelegramPosts)
        .set({ processingStatus: "ignored" })
        .where(eq(rawTelegramPosts.id, rawRow.id));
      skipped += 1;
      continue;
    }

    const outcome = await materializeListing({
      channelId: channel.id,
      rawPostId: rawRow.id,
      categoryId: cat!.id,
      publishedAt: msg.postedAt,
      originalPostUrl: `https://t.me/${channel.username}/${msg.externalId}`,
      mediaUrls: msg.mediaUrls,
      extracted,
    });

    if (outcome === "new") inserted += 1;
    else if (outcome === "duplicate") duplicates += 1;
    else skipped += 1;
  }

  // Stamp the channel with the sync RUN time (not the newest post's
  // publish time — that was a semantic bug). The watermark for the
  // NEXT sync's incremental fetch is derived from raw_telegram_posts
  // at the top of this function, not stored here.
  await db
    .update(telegramChannels)
    .set({
      lastSyncedAt: new Date(),
      lastSyncStatus: "ok",
      lastSyncError: null,
      postsImportedCount: channel.postsImportedCount + inserted + duplicates,
      updatedAt: new Date(),
    })
    .where(eq(telegramChannels.id, channel.id));

  return { fetched: messages.length, inserted, duplicates, skipped };
}

async function upsertRawPost(channelId: string, msg: IngestionRawMessage) {
  const [row] = await db
    .insert(rawTelegramPosts)
    .values({
      telegramChannelId: channelId,
      telegramMessageId: msg.externalId,
      originalPostUrl:
        (msg.raw.url as string | undefined) ??
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

type MaterializeOutcome = "new" | "duplicate" | "skipped";

/**
 * Either create a fresh listings row or attach this raw post to an
 * existing canonical listing via listing_sources.
 */
async function materializeListing(input: {
  channelId: string;
  rawPostId: string;
  categoryId: string;
  publishedAt: Date;
  originalPostUrl: string;
  mediaUrls: string[];
  extracted: ExtractedListing;
}): Promise<MaterializeOutcome> {
  // Re-ingestion safety: if a listing already owns this raw_post as its
  // primary source, skip (the raw post was processed in a prior run).
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
    return "skipped";
  }

  const dedup = await findDuplicate(input.extracted);

  if (dedup.kind === "duplicate") {
    // Attach as a new source to the canonical listing
    await db.insert(listingSources).values({
      listingId: dedup.canonicalListingId,
      rawTelegramPostId: input.rawPostId,
      telegramChannelId: input.channelId,
      originalPostUrl: input.originalPostUrl,
      publishedAt: input.publishedAt,
    });
    await db
      .update(listings)
      .set({
        sourceCount: sql`${listings.sourceCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(listings.id, dedup.canonicalListingId));
    await db
      .update(rawTelegramPosts)
      .set({ processingStatus: "processed" })
      .where(eq(rawTelegramPosts.id, input.rawPostId));
    return "duplicate";
  }

  // No duplicate → insert fresh
  const { extracted } = input;
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

  return "new";
}

/**
 * Build a one-line hint string the LLM extractor can use to bias
 * ambiguous classifications. Includes the username (often the most
 * informative signal — `*_arenda` = rentals, `*_sotuv` = sales) and
 * the human-readable title.
 */
function buildChannelContext(username: string, title: string): string {
  const u = username.toLowerCase();
  const hints: string[] = [];
  if (/(arenda|ijara|rent)/.test(u))
    hints.push("rental-focused (every post is a long-term rental)");
  if (/(sotuv|prodaj|sale|sell)/.test(u))
    hints.push("sales-focused (every post is for sale)");
  if (/(posutoch|sutki|daily)/.test(u))
    hints.push("daily-rental-focused (per-night)");
  const hint = hints.length > 0 ? ` — ${hints.join(", ")}` : "";
  return `@${username} — "${title}"${hint}`;
}
