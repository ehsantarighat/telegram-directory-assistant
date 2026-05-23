/**
 * pnpm tsx scripts/backfill-photos.ts [--dry-run] [--channel=username]
 *
 * Re-host photos for listings whose mediaUrls still point to the
 * Telegram CDN (which expires its signed URLs in hours/days).
 *
 * For each affected listing:
 *   1. Look up the original raw_telegram_post to recover channel +
 *      message_id
 *   2. Re-scrape t.me/s/<channel>?before=<msg_id+5> to get a FRESH
 *      photo URL set for the same message
 *   3. rehostPhotos() downloads each fresh URL and uploads to
 *      Supabase Storage under the same path scheme used by the
 *      ingest pipeline
 *   4. UPDATE listings.mediaUrls + mainImageUrl + hasPhotos
 *
 * If a message is no longer reachable via Telegram's preview window
 * (very old posts), the listing's mediaUrls are cleared so the UI
 * shows the placeholder instead of a broken-URL gallery.
 *
 * Idempotent — only acts on listings whose mainImageUrl contains
 * "telesco.pe", so re-running after a partial run picks up where it
 * left off. Re-running after a full success is a no-op.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in env.
 *
 * Flags:
 *   --dry-run             Don't write anything, just report what
 *                         would be touched.
 *   --channel=<username>  Limit to one channel (faster to test).
 */
import { config as loadDotenv } from "dotenv";
loadDotenv({ path: ".env.local", override: false });

import { eq, sql, and } from "drizzle-orm";

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const channelFilter = args
    .find((a) => a.startsWith("--channel="))
    ?.split("=")[1];

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      "SUPABASE_SERVICE_ROLE_KEY is required. Add it to .env.local " +
        "(get it from Supabase dashboard → Settings → API Keys → " +
        "service_role) and re-run.",
    );
    process.exit(1);
  }

  console.log(
    `[backfill] starting ${dryRun ? "(DRY RUN)" : ""}${
      channelFilter ? ` for @${channelFilter}` : ""
    }`,
  );

  const { db } = await import("@/db");
  const {
    listings,
    rawTelegramPosts,
    telegramChannels,
  } = await import("@/db/schema");
  const { rehostPhotos } = await import("@/lib/ingestion/storage");
  const { parseChannelHtml } = await import("@/lib/ingestion/telegram-web");

  // 1. Find affected listings, grouped by channel.
  const baseRows = await db
    .select({
      listingId: listings.id,
      messageId: rawTelegramPosts.telegramMessageId,
      channelId: telegramChannels.id,
      channelUsername: telegramChannels.username,
      channelStatus: telegramChannels.status,
      mainImageUrl: listings.mainImageUrl,
    })
    .from(listings)
    .innerJoin(
      rawTelegramPosts,
      eq(rawTelegramPosts.id, listings.primaryRawPostId),
    )
    .innerJoin(
      telegramChannels,
      eq(telegramChannels.id, rawTelegramPosts.telegramChannelId),
    )
    .where(
      and(
        eq(listings.status, "active"),
        sql`${listings.mainImageUrl} like '%telesco.pe%'`,
      ),
    );

  const affected = channelFilter
    ? baseRows.filter((r) => r.channelUsername === channelFilter)
    : baseRows;

  console.log(`[backfill] ${affected.length} listings need re-hosting`);
  if (affected.length === 0) {
    process.exit(0);
  }

  // Group by channel so each channel page only gets scraped once,
  // and so we can stride backwards through the preview history.
  const byChannel = new Map<
    string,
    {
      channelId: string;
      channelUsername: string;
      channelActive: boolean;
      listings: Array<{ listingId: string; messageId: number }>;
    }
  >();
  for (const r of affected) {
    const key = r.channelUsername;
    if (!byChannel.has(key)) {
      byChannel.set(key, {
        channelId: r.channelId,
        channelUsername: r.channelUsername,
        channelActive: r.channelStatus === "active",
        listings: [],
      });
    }
    byChannel.get(key)!.listings.push({
      listingId: r.listingId,
      messageId: r.messageId,
    });
  }

  let totalRehosted = 0;
  let totalCleared = 0;
  let totalChannelsScraped = 0;

  for (const [username, group] of byChannel) {
    console.log(
      `\n[backfill] @${username}: ${group.listings.length} listings to re-host`,
    );

    // Sort by messageId descending so we walk the preview history
    // from newest to oldest in one pass.
    group.listings.sort((a, b) => b.messageId - a.messageId);

    // Build a lookup map by message_id from successive page scrapes.
    const messageMap = new Map<number, string[]>();
    const targetIds = new Set(group.listings.map((l) => l.messageId));
    let cursor: number | null = null;
    let pages = 0;
    const MAX_PAGES = 25;

    while (targetIds.size > 0 && pages < MAX_PAGES) {
      pages += 1;
      const url = `https://t.me/s/${username}${
        cursor ? `?before=${cursor}` : ""
      }`;
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
        redirect: "manual",
      });
      if (res.status >= 300 && res.status < 400) {
        console.log(
          `  ⚠ @${username} no longer exposes a public preview; can't backfill`,
        );
        break;
      }
      if (!res.ok) {
        console.log(`  ⚠ HTTP ${res.status} from t.me, stopping channel`);
        break;
      }
      const html = await res.text();
      const messages = parseChannelHtml(html, username);
      if (messages.length === 0) break;

      let lowest = Number.POSITIVE_INFINITY;
      for (const m of messages) {
        // Only photo URLs (drop video / external)
        const photos = m.mediaUrls.filter((u) => u.includes("telesco.pe"));
        if (photos.length > 0) {
          messageMap.set(m.externalId, photos);
          targetIds.delete(m.externalId);
        }
        lowest = Math.min(lowest, m.externalId);
      }
      if (!Number.isFinite(lowest)) break;
      cursor = lowest;
    }
    totalChannelsScraped += 1;

    // For each listing in this channel, fetch its photos by message_id
    // and re-host them. If the message wasn't found in the preview
    // page (the lead message is text-only with hidden album members),
    // try the adjacent ID's embed page — Telegram returns the full
    // album from any member message.
    for (const l of group.listings) {
      let freshUrls = messageMap.get(l.messageId);
      if (!freshUrls || freshUrls.length === 0) {
        // Album recovery: text-only-lead convention. The album members
        // (which Telegram hides from the channel preview) are at the
        // message IDs just before this one. Fetch their embed and
        // extract the album photos.
        try {
          const embedUrl = `https://t.me/${username}/${l.messageId - 1}?embed=1`;
          const res = await fetch(embedUrl, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            },
          });
          if (res.ok) {
            const html = await res.text();
            const re =
              /background-image:url\('(https:\/\/cdn\d+\.telesco\.pe\/[^']+)'\)/g;
            const urls: string[] = [];
            const seen = new Set<string>();
            let m: RegExpExecArray | null;
            while ((m = re.exec(html)) !== null) {
              if (!seen.has(m[1])) {
                seen.add(m[1]);
                urls.push(m[1]);
              }
            }
            if (urls.length > 0) freshUrls = urls;
          }
        } catch {
          // best-effort
        }
      }
      if (!freshUrls || freshUrls.length === 0) {
        // Couldn't find this message in the recent preview; old post
        // or removed. Clear photos so the UI shows the placeholder
        // instead of broken URLs.
        if (dryRun) {
          console.log(
            `  - msg ${l.messageId}: NOT in preview window, would clear`,
          );
        } else {
          await db
            .update(listings)
            .set({
              mediaUrls: [],
              mainImageUrl: null,
              hasPhotos: false,
              updatedAt: new Date(),
            })
            .where(eq(listings.id, l.listingId));
          totalCleared += 1;
          console.log(
            `  ⚠ msg ${l.messageId}: cleared (not in preview window)`,
          );
        }
        continue;
      }

      if (dryRun) {
        console.log(
          `  ✓ msg ${l.messageId}: ${freshUrls.length} fresh URLs found, would re-host`,
        );
        continue;
      }

      const { urls } = await rehostPhotos({
        sourceUrls: freshUrls,
        channelUsername: username,
        messageId: l.messageId,
      });
      if (urls.length === 0) {
        console.log(`  ⚠ msg ${l.messageId}: rehost yielded 0 urls`);
        continue;
      }
      await db
        .update(listings)
        .set({
          mediaUrls: urls,
          mainImageUrl: urls[0] ?? null,
          hasPhotos: urls.length > 0,
          updatedAt: new Date(),
        })
        .where(eq(listings.id, l.listingId));
      totalRehosted += 1;
      console.log(`  ✓ msg ${l.messageId}: ${urls.length} photos re-hosted`);
    }
  }

  console.log(
    `\n[backfill] done. ${totalRehosted} listings re-hosted, ` +
      `${totalCleared} cleared (no longer reachable), ` +
      `${totalChannelsScraped} channels scraped.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[backfill] crashed:", err);
    process.exit(1);
  });
