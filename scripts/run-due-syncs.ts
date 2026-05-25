/**
 * pnpm sync:due
 *
 * Auto-sync runner — meant to be invoked by Railway's cron service
 * (or any external scheduler) on a tight interval (every 5-10 min).
 *
 * On each tick it picks channels eligible for sync:
 *   - status = 'active'
 *   - sync_interval_minutes > 0
 *   - last_synced_at IS NULL  OR  now() >= last_synced_at + sync_interval_minutes
 *
 * Then syncs them sequentially (NOT in parallel — keeps Telegram
 * request rate low to avoid IP-level rate-limiting). Each sync uses
 * the same TelegramWebSource bounds as the admin "Run sync" button.
 *
 * Why sequential, not parallel:
 *   Telegram's public web previews are served by a single CDN that
 *   throttles aggressive clients. Hitting 10 channels in parallel
 *   from one Railway pod IP can earn a temporary block. Sequential
 *   keeps us friendly. For ~50 channels at 100 posts each the full
 *   sweep takes 1-5 min, comfortably under any 10-min tick.
 *
 * Why we ignore failures (continue on error):
 *   The pipeline already catches per-post failures internally (commit
 *   60b64a8). Channel-level failures get logged + recorded in
 *   lastSyncError and we continue with the next channel.
 *
 * Exit code:
 *   0  always — even when individual channels fail. Cron systems
 *      treat exit!=0 as "the cron itself broke" and alert/page on it,
 *      which is wrong for "one channel of fifty failed". The admin
 *      panel is the source of truth for per-channel failures.
 *   1  only when the runner itself can't start (DB unreachable,
 *      missing env, etc.).
 */
import { config as loadDotenv } from "dotenv";

loadDotenv({ path: ".env.local", override: false });

async function main() {
  const { closeDbPool, db } = await import("@/db");
  const { telegramChannels } = await import("@/db/schema");
  const { and, eq, gt, isNull, or, sql } = await import("drizzle-orm");
  const { ingestChannel } = await import("@/lib/ingestion/pipeline");
  const { TelegramWebSource } = await import("@/lib/ingestion/telegram-web");

  const startedAt = Date.now();

  // Due-channel query. Postgres handles the time math via interval
  // multiplication so the cadence stays correct regardless of
  // timezone or DST. Filtering happens server-side — we don't pull
  // every channel into Node memory.
  //
  // Sort by last_synced_at NULLS FIRST so first-time syncs (a
  // freshly-added channel) get top priority and stale-but-due channels
  // run in order of how stale they are.
  const dueChannels = await db
    .select({
      id: telegramChannels.id,
      username: telegramChannels.username,
      lastSyncedAt: telegramChannels.lastSyncedAt,
      syncIntervalMinutes: telegramChannels.syncIntervalMinutes,
    })
    .from(telegramChannels)
    .where(
      and(
        eq(telegramChannels.status, "active"),
        gt(telegramChannels.syncIntervalMinutes, 0),
        or(
          isNull(telegramChannels.lastSyncedAt),
          sql`now() >= ${telegramChannels.lastSyncedAt} + (${telegramChannels.syncIntervalMinutes} * interval '1 minute')`,
        ),
      ),
    )
    .orderBy(
      sql`${telegramChannels.lastSyncedAt} asc nulls first`,
    );

  console.log(
    `[sync:due] ${dueChannels.length} channel(s) due at ${new Date().toISOString()}`,
  );

  if (dueChannels.length === 0) {
    await closeDbPool();
    process.exit(0);
  }

  // Reuse one TelegramWebSource across all channels in this tick.
  // It's stateless aside from constructor bounds, so the same instance
  // is fine.
  const source = new TelegramWebSource({
    maxPosts: 100,
    maxAgeDays: 183,
  });

  let okCount = 0;
  let errorCount = 0;

  for (const ch of dueChannels) {
    const channelStarted = Date.now();
    try {
      const result = await ingestChannel({
        source,
        channelUsername: ch.username,
        limit: 100,
      });
      const elapsed = Math.round((Date.now() - channelStarted) / 1000);
      console.log(
        `[sync:due] @${ch.username} ok in ${elapsed}s — fetched=${result.fetched} inserted=${result.inserted} duplicates=${result.duplicates} skipped=${result.skipped} failed=${result.failed}`,
      );
      okCount += 1;
    } catch (err) {
      const elapsed = Math.round((Date.now() - channelStarted) / 1000);
      const message = err instanceof Error ? err.message : String(err);
      // ingestChannel writes lastSyncStatus='error' itself on per-post
      // catastrophic failure. On runner-level catches we also stamp the
      // channel so the admin UI shows what went wrong.
      try {
        await db
          .update(telegramChannels)
          .set({
            lastSyncStatus: "error",
            lastSyncError: message.slice(0, 200),
            updatedAt: new Date(),
          })
          .where(eq(telegramChannels.id, ch.id));
      } catch {
        // ignore — we're already in an error branch
      }
      console.error(
        `[sync:due] @${ch.username} FAILED in ${elapsed}s — ${message}`,
      );
      errorCount += 1;
    }
  }

  const totalSec = Math.round((Date.now() - startedAt) / 1000);
  console.log(
    `[sync:due] done in ${totalSec}s — ok=${okCount} errors=${errorCount}`,
  );

  await closeDbPool();
}

main().catch((err) => {
  console.error("[sync:due] runner crashed:", err);
  process.exit(1);
});
