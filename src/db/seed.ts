import { config as loadDotenv } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { categories } from "./schema";

loadDotenv({ path: ".env.local", override: false });

/**
 * Phase 2 seed: ensures the single MVP category ("Real Estate") exists.
 *
 * Phase 3 will extend this script with:
 *   - 5+ realistic telegram_channels
 *   - 30+ listings (rent / sale / daily_rent mix, Tashkent districts,
 *     USD + UZS, photos + no-photos, 3 duplicate groups, etc.)
 *   - listing_sources rows for duplicate groups
 *   - listing_translations rows for en / ru / fa (fa is rtl)
 *   - linked raw_telegram_posts
 *
 * For now this is intentionally minimal so `pnpm db:seed` is safe to
 * run against the live DB to bootstrap the category lookup before any
 * other phase touches data.
 *
 * Idempotent: uses ON CONFLICT on the unique `slug`.
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

  console.log("Seeding Real Estate category...");
  await db
    .insert(categories)
    .values({
      name: "Real Estate",
      slug: "real-estate",
      status: "active",
    })
    .onConflictDoUpdate({
      target: categories.slug,
      set: { name: "Real Estate", status: "active" },
    });

  console.log("Phase 2 seed complete. Real Estate category exists.");
  console.log("Phase 3 will load channels + listings + translations.");

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
