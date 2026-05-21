import { randomUUID } from "node:crypto";
import { config as loadDotenv } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, sql } from "drizzle-orm";
import postgres from "postgres";

import {
  categories,
  listingSources,
  listingTranslations,
  listings,
  rawTelegramPosts,
  telegramChannels,
} from "./schema";
import { seedChannels } from "./seed-data/channels";
import { seedListings } from "./seed-data/listings";
import { seedTranslations } from "./seed-data/translations";

loadDotenv({ path: ".env.local", override: false });

/**
 * Phase 3 seed.
 *
 * Truncates the seed-mutable tables (listing_sources, listing_translations,
 * listings, raw_telegram_posts, telegram_channels) and rebuilds everything
 * with full referential integrity:
 *
 *   - 5 telegram_channels
 *   - 30 listings (rent / sale / daily mix; Tashkent districts + Samarkand;
 *     UZS + USD; with / without photos; with / without contact telegram)
 *   - 30+ raw_telegram_posts (1 per listing, plus extras for duplicate groups)
 *   - 30+ listing_sources (1 per listing, plus extras for duplicate groups)
 *   - 9 listing_translations (3 listings × 3 languages, fa = rtl)
 *   - Real Estate category (created if missing)
 *
 * Keeps user_profiles + saved_listings + saved_searches +
 * channel_suggestions + removal_requests untouched (auth + admin flows
 * are Phase 5/7/8).
 *
 * Idempotent — re-running is safe. The truncate ensures no duplicate
 * channel_username or stale listings.
 *
 * WARNING: this script TRUNCATES the listings + raw_telegram_posts tables.
 * Do not run against a DB with real ingested data unless you intend to
 * wipe it.
 */
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is required. Copy .env.example to .env.local and fill it in.",
    );
  }

  const client = postgres(url, { max: 1, prepare: false });
  const db = drizzle(client);

  console.log("Ensuring Real Estate category exists...");
  const [categoryRow] = await db
    .insert(categories)
    .values({
      name: "Real Estate",
      slug: "real-estate",
      status: "active",
    })
    .onConflictDoUpdate({
      target: categories.slug,
      set: { name: "Real Estate", status: "active" },
    })
    .returning();
  const realEstateId = categoryRow.id;

  console.log("Truncating seed-mutable tables...");
  // CASCADE wipes dependent rows. Order matters less with CASCADE, but we
  // truncate in dependency order for clarity. saved_listings is left alone
  // (no users to reference yet); listing_sources cascades from listings.
  await db.execute(sql`
    truncate table
      listing_sources,
      listing_translations,
      listings,
      raw_telegram_posts,
      telegram_channels
    restart identity cascade
  `);

  // ------------------ channels ------------------
  console.log(`Inserting ${seedChannels.length} channels...`);
  const channelIdByUsername = new Map<string, string>();
  for (const ch of seedChannels) {
    const [row] = await db
      .insert(telegramChannels)
      .values({
        title: ch.title,
        username: ch.username,
        url: ch.url,
        categoryId: realEstateId,
        country: "Uzbekistan",
        city: ch.city,
        language: ch.language,
        status: "active",
        lastSyncedAt: new Date(),
        lastSyncStatus: "ok",
        postsImportedCount: ch.postsImportedCount,
      })
      .returning();
    channelIdByUsername.set(ch.username, row.id);
  }

  // ------------------ listings + raw posts + sources ------------------
  console.log(`Inserting ${seedListings.length} listings...`);
  const listingIdBySeedKey = new Map<string, string>();
  const duplicateGroupIdByTag = new Map<string, string>();

  // Reserve raw-message-id counter so each raw post has a unique
  // telegram_message_id per channel (the unique-index guard).
  let messageIdCounter = 10_000;

  for (const tpl of seedListings) {
    const primaryChannelId = channelIdByUsername.get(tpl.primaryChannel);
    if (!primaryChannelId) {
      throw new Error(`Unknown primary channel: ${tpl.primaryChannel}`);
    }

    // Decide duplicate_group_id. If the template marks a duplicate group,
    // all listings sharing the same tag get the same UUID. For seed we
    // only use additionalChannels (one canonical listing posted in many
    // channels via listing_sources), so the duplicate_group_id is mostly
    // a flag here — handy for admin queries.
    let duplicateGroupId: string | null = null;
    if (tpl.duplicateGroupTag) {
      let existing = duplicateGroupIdByTag.get(tpl.duplicateGroupTag);
      if (!existing) {
        existing = randomUUID();
        duplicateGroupIdByTag.set(tpl.duplicateGroupTag, existing);
      }
      duplicateGroupId = existing;
    }

    const additional = tpl.additionalChannels ?? [];
    const totalSources = 1 + additional.length;

    // Primary raw_telegram_post (canonical source)
    const primaryMessageId = ++messageIdCounter;
    const [primaryRawPost] = await db
      .insert(rawTelegramPosts)
      .values({
        telegramChannelId: primaryChannelId,
        telegramMessageId: primaryMessageId,
        originalPostUrl: `https://t.me/${tpl.primaryChannel}/${primaryMessageId}`,
        originalText: tpl.originalText,
        detectedLanguage: tpl.detectedLanguage,
        publishedAt: tpl.publishedAt!,
        hasMedia: tpl.hasPhotos,
        mediaMetadata: tpl.hasPhotos ? { urls: tpl.mediaUrls } : {},
        rawPayloadJson: { seeded: true, seedKey: tpl.seedKey },
        processingStatus: "processed",
      })
      .returning();

    // The canonical listing row
    const [listingRow] = await db
      .insert(listings)
      .values({
        categoryId: realEstateId,
        primaryRawPostId: primaryRawPost.id,
        listingType: tpl.listingType,
        propertyType: tpl.propertyType,
        title: tpl.title,
        summary: tpl.summary,
        originalText: tpl.originalText,
        detectedLanguage: tpl.detectedLanguage,
        country: tpl.country,
        city: tpl.city,
        district: tpl.district,
        neighborhood: tpl.neighborhood,
        price: tpl.price,
        currency: tpl.currency,
        rooms: tpl.rooms,
        areaSqm: tpl.areaSqm,
        floor: tpl.floor,
        totalFloors: tpl.totalFloors,
        furnished: tpl.furnished,
        newBuilding: tpl.newBuilding,
        renovationStatus: tpl.renovationStatus,
        metroNearby: tpl.metroNearby,
        ownerOrAgent: tpl.ownerOrAgent,
        commission: tpl.commission,
        parking: tpl.parking,
        balcony: tpl.balcony,
        elevator: tpl.elevator,
        petsAllowed: tpl.petsAllowed,
        heatingType: tpl.heatingType,
        buildingMaterial: tpl.buildingMaterial,
        contactPhone: tpl.contactPhone,
        contactTelegram: tpl.contactTelegram,
        hasPhotos: tpl.hasPhotos,
        mainImageUrl: tpl.mainImageUrl,
        mediaUrls: tpl.mediaUrls,
        sourceCount: totalSources,
        savedCount: tpl.savedCount,
        duplicateGroupId,
        publishedAt: tpl.publishedAt,
        status: tpl.status,
        extractionConfidenceJson: tpl.extractionConfidenceJson,
      })
      .returning();
    listingIdBySeedKey.set(tpl.seedKey, listingRow.id);

    // Primary listing_source
    await db.insert(listingSources).values({
      listingId: listingRow.id,
      rawTelegramPostId: primaryRawPost.id,
      telegramChannelId: primaryChannelId,
      originalPostUrl: primaryRawPost.originalPostUrl,
      publishedAt: tpl.publishedAt!,
    });

    // Additional channels: each gets a new raw_telegram_post + listing_source
    // pointing back to the same canonical listing. Posted a few hours apart
    // so the source-group "first seen" / "last seen" UI has data to render.
    for (let i = 0; i < additional.length; i++) {
      const otherChannel = additional[i];
      const otherChannelId = channelIdByUsername.get(otherChannel);
      if (!otherChannelId) {
        throw new Error(`Unknown additional channel: ${otherChannel}`);
      }
      const otherMessageId = ++messageIdCounter;
      const otherPublishedAt = new Date(
        tpl.publishedAt!.getTime() + (i + 1) * 6 * 60 * 60 * 1000,
      );

      const [otherRawPost] = await db
        .insert(rawTelegramPosts)
        .values({
          telegramChannelId: otherChannelId,
          telegramMessageId: otherMessageId,
          originalPostUrl: `https://t.me/${otherChannel}/${otherMessageId}`,
          originalText: tpl.originalText,
          detectedLanguage: tpl.detectedLanguage,
          publishedAt: otherPublishedAt,
          hasMedia: tpl.hasPhotos,
          mediaMetadata: tpl.hasPhotos ? { urls: tpl.mediaUrls } : {},
          rawPayloadJson: {
            seeded: true,
            seedKey: tpl.seedKey,
            duplicateOf: tpl.seedKey,
          },
          processingStatus: "processed",
        })
        .returning();

      await db.insert(listingSources).values({
        listingId: listingRow.id,
        rawTelegramPostId: otherRawPost.id,
        telegramChannelId: otherChannelId,
        originalPostUrl: otherRawPost.originalPostUrl,
        publishedAt: otherPublishedAt,
      });
    }
  }

  // ------------------ translations ------------------
  console.log(`Inserting ${seedTranslations.length} translations...`);
  for (const t of seedTranslations) {
    const listingId = listingIdBySeedKey.get(t.listingSeedKey);
    if (!listingId) {
      throw new Error(
        `Translation references unknown listing seedKey: ${t.listingSeedKey}`,
      );
    }
    await db.insert(listingTranslations).values({
      listingId,
      language: t.language,
      translatedTitle: t.translatedTitle,
      translatedSummary: t.translatedSummary,
      translatedText: t.translatedText,
      direction: t.direction,
      provider: t.provider,
    });
  }

  // ------------------ summary ------------------
  const [counts] = await db
    .select({
      channels: sql<number>`(select count(*) from ${telegramChannels})::int`,
      listings: sql<number>`(select count(*) from ${listings})::int`,
      rawPosts: sql<number>`(select count(*) from ${rawTelegramPosts})::int`,
      sources: sql<number>`(select count(*) from ${listingSources})::int`,
      translations: sql<number>`(select count(*) from ${listingTranslations})::int`,
      duplicates: sql<number>`(select count(*) from ${listings} where ${listings.duplicateGroupId} is not null)::int`,
      ftListings: sql<number>`(select count(*) from ${listings} where ${listings.status} = 'active')::int`,
    })
    .from(categories)
    .where(eq(categories.id, realEstateId));

  console.log("Done. Final counts:");
  console.log(`  telegram_channels:    ${counts.channels}`);
  console.log(`  listings (active):    ${counts.ftListings} / ${counts.listings}`);
  console.log(`  raw_telegram_posts:   ${counts.rawPosts}`);
  console.log(`  listing_sources:      ${counts.sources}`);
  console.log(`  listing_translations: ${counts.translations}`);
  console.log(`  listings w/ duplicate_group_id: ${counts.duplicates}`);

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
