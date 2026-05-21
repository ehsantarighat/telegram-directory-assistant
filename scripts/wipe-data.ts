/**
 * pnpm db:wipe -- --yes
 *
 * Empties every listing-related table so you can start fresh (e.g.
 * before connecting a real Telegram channel). Idempotent and safe to
 * re-run.
 *
 * Wiped (TRUNCATE CASCADE):
 *   - telegram_channels        (and their raw posts / sources via FK cascade)
 *   - listings                 (and their translations / saved bookmarks)
 *   - listing_sources, listing_translations, saved_listings (explicit, in case cascade misses)
 *   - channel_suggestions      (cleanup)
 *   - removal_requests         (cleanup)
 *
 * Kept untouched:
 *   - categories               (the Real Estate row is bootstrap data)
 *   - user_profiles            (your admin account + any signed-up users)
 *   - auth.users               (owned by Supabase; never our place to touch)
 *   - drizzle migrations history
 *
 * Requires `--yes` (or env var WIPE_CONFIRM=yes) to actually run, so a
 * stray pnpm db:wipe doesn't accidentally torch your data.
 */
import { config as loadDotenv } from "dotenv";
loadDotenv({ path: ".env.local", override: false });

const TABLES = [
  "listing_translations",
  "listing_sources",
  "saved_listings",
  "removal_requests",
  "channel_suggestions",
  "listings",
  "raw_telegram_posts",
  "telegram_channels",
] as const;

async function main() {
  const args = process.argv.slice(2);
  const confirmed = args.includes("--yes") || process.env.WIPE_CONFIRM === "yes";

  if (!confirmed) {
    console.error(
      "Refusing to run without explicit confirmation.\n" +
        "Pass --yes (or WIPE_CONFIRM=yes) once you're sure:\n\n" +
        "    pnpm db:wipe -- --yes\n",
    );
    process.exit(1);
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL not set. Aborting.");
    process.exit(1);
  }

  const sql = await connectPostgres(url);

  try {
    console.log("--- BEFORE ---");
    await reportCounts(sql);

    console.log("\nTruncating " + TABLES.length + " tables (CASCADE)…");
    // One TRUNCATE statement handles all of them atomically.
    const list = TABLES.join(", ");
    await sql.unsafe(`truncate table ${list} restart identity cascade`);

    console.log("\n--- AFTER ---");
    await reportCounts(sql);

    // Make sure the Real Estate category survives (it's bootstrap data)
    const cats = await sql<{ slug: string; name: string }[]>`
      select slug, name from public.categories where slug = 'real-estate' limit 1
    `;
    if (cats.length === 0) {
      console.log("\nRe-creating Real Estate category (was missing)…");
      await sql`
        insert into public.categories (name, slug, status)
        values ('Real Estate', 'real-estate', 'active')
      `;
    } else {
      console.log(`\nCategories preserved (real-estate: ${cats[0].name}).`);
    }

    const profiles = await sql<{ n: number }[]>`
      select count(*)::int as n from public.user_profiles
    `;
    console.log(`User profiles preserved (${profiles[0].n} rows).`);

    console.log("\nDone. Add real channels via /admin/channels.");
  } finally {
    await sql.end({ timeout: 2 });
  }
}

type Sql = Awaited<ReturnType<typeof connectPostgres>>;

async function connectPostgres(url: string) {
  const { default: postgres } = await import("postgres");
  return postgres(url, {
    max: 1,
    prepare: false,
    ssl: { rejectUnauthorized: false },
  });
}

async function reportCounts(sql: Sql) {
  const counts: Record<string, number> = {};
  for (const t of TABLES) {
    const rows = await sql.unsafe<{ n: number }[]>(
      `select count(*)::int as n from public.${t}`,
    );
    counts[t] = rows[0]?.n ?? 0;
  }
  const widest = Math.max(...TABLES.map((t) => t.length));
  for (const t of TABLES) {
    console.log(`  ${t.padEnd(widest)}  ${counts[t]}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
