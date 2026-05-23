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
import { rehostPhotos } from "./storage";
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
  let processed = 0;

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
      channelUsername: channel.username,
      messageId: msg.externalId,
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

    // Heartbeat. Touches updatedAt so the channels table can show
    // "stalled" for any sync whose updatedAt hasn't moved in a while,
    // and progress is visible via lastSyncError (which we repurpose
    // as a status line while running — gets cleared to null on success).
    processed += 1;
    if (processed % 5 === 0 || processed === messages.length) {
      await db
        .update(telegramChannels)
        .set({
          lastSyncStatus: "running",
          lastSyncError: `Processed ${processed}/${messages.length}`,
          updatedAt: new Date(),
        })
        .where(eq(telegramChannels.id, channel.id));
    }
  }

  // Stamp the channel with the sync RUN time (not the newest post's
  // publish time — that was a semantic bug). The watermark for the
  // NEXT sync's incremental fetch is derived from raw_telegram_posts
  // at the top of this function, not stored here.
  //
  // Note: we no longer write postsImportedCount. The dashboard and
  // channels table both derive post counts from
  //   count(*) from raw_telegram_posts where channel_id = X
  // which is impossible to inflate (unique index on
  // channel_id + message_id). The stored accumulator was prone to
  // drift across re-syncs and the resurrect flow.
  await db
    .update(telegramChannels)
    .set({
      lastSyncedAt: new Date(),
      lastSyncStatus: "ok",
      lastSyncError: null,
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
  channelUsername: string;
  messageId: number;
  rawPostId: string;
  categoryId: string;
  publishedAt: Date;
  originalPostUrl: string;
  mediaUrls: string[];
  extracted: ExtractedListing;
}): Promise<MaterializeOutcome> {
  // Re-ingestion safety: if THIS raw_post already has a listing_sources
  // row, skip — it was processed in a prior run (either as primary or
  // as a dedup-attached secondary). The earlier version of this guard
  // only checked listings.primary_raw_post_id, which missed the
  // secondary-source case. On re-sync the LLM extractor produces
  // slightly different fields → dedup matches a different listing →
  // a SECOND listing_sources row gets inserted for the same raw_post.
  // Over many syncs that inflates distinct-listings-per-channel above
  // distinct-raw-posts-per-channel, which is mathematically nonsensical.
  //
  // The DB-level unique index on listing_sources.raw_telegram_post_id
  // (added in migration 0002) backs this up — a second insert for the
  // same raw_post would fail at the DB level even if this check were
  // bypassed. The app-level check just keeps us from doing dedup work
  // and an LLM call that we'd then have to throw away.
  const existingSource = await db
    .select({ id: listingSources.id })
    .from(listingSources)
    .where(eq(listingSources.rawTelegramPostId, input.rawPostId))
    .limit(1);
  if (existingSource.length > 0) {
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

  // No duplicate → insert fresh.
  //
  // Photos: rehost from Telegram CDN to Supabase Storage BEFORE we
  // insert. Telegram URLs expire in hours/days, so the URLs we'd
  // write to listings.mediaUrls would go stale and break the
  // gallery. After rehosting, mediaUrls holds permanent
  // *.supabase.co URLs.
  //
  // Failed downloads (a particular image that won't fetch — already
  // expired, network blip, etc.) are dropped from the array rather
  // than padded with nulls. Better to render a 7-photo gallery than
  // an 8-slot gallery with 1 broken thumbnail.
  //
  // When SUPABASE_SERVICE_ROLE_KEY is unset, rehostPhotos returns
  // sourceUrls unchanged — legacy hot-link mode. The deploy stays
  // usable; photos just break after CDN TTL like before.
  const rehost = await rehostPhotos({
    sourceUrls: input.mediaUrls,
    channelUsername: input.channelUsername,
    messageId: input.messageId,
  });
  if (
    rehost.rehostedCount > 0 ||
    rehost.cachedCount > 0 ||
    rehost.failedCount > 0
  ) {
    console.log(
      `[ingest] rehost @${input.channelUsername}/${input.messageId}: ` +
        `${rehost.rehostedCount} new, ${rehost.cachedCount} cached, ` +
        `${rehost.failedCount} failed`,
    );
  }
  const stableMediaUrls = rehost.urls;

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
      hasPhotos: stableMediaUrls.length > 0,
      mainImageUrl: stableMediaUrls[0] ?? null,
      mediaUrls: stableMediaUrls,
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
