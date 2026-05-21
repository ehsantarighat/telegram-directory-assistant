import { createHash } from "node:crypto";
import { config as loadDotenv } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { inArray, sql } from "drizzle-orm";
import postgres from "postgres";
import {
  categories,
  channels,
  countries,
  listings,
  locations,
  rawMessages,
} from "./schema";
import { seedChannels } from "./seed-data/channels";
import {
  tashkentDistricts,
  uzbekistanCities,
} from "./seed-data/locations";
import {
  UZS_PER_USD,
  pickPhotos,
  seedListingTemplates,
} from "./seed-data/listings";

loadDotenv({ path: ".env.local", override: false });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is required. Copy .env.example to .env.local and fill it in.",
    );
  }

  const client = postgres(url, { max: 1, prepare: false });
  const db = drizzle(client);

  console.log("Seeding countries...");
  const [country] = await db
    .insert(countries)
    .values({
      code: "UZ",
      name: "Uzbekistan",
      currencyCode: "UZS",
      defaultLanguage: "uz",
    })
    .onConflictDoUpdate({
      target: countries.code,
      set: {
        name: "Uzbekistan",
        currencyCode: "UZS",
        defaultLanguage: "uz",
      },
    })
    .returning();

  console.log("Seeding categories...");
  const [rootCategory] = await db
    .insert(categories)
    .values({
      slug: "real-estate",
      name: "Real Estate",
      icon: "home",
      sortOrder: 0,
    })
    .onConflictDoUpdate({
      target: categories.slug,
      set: { name: "Real Estate", icon: "home" },
    })
    .returning();

  const subSlugs = [
    { slug: "real-estate-rent", name: "Rent", sortOrder: 1 },
    { slug: "real-estate-sale", name: "Sale", sortOrder: 2 },
    { slug: "real-estate-daily", name: "Daily Rent", sortOrder: 3 },
  ];
  for (const sub of subSlugs) {
    await db
      .insert(categories)
      .values({
        slug: sub.slug,
        name: sub.name,
        parentId: rootCategory.id,
        sortOrder: sub.sortOrder,
      })
      .onConflictDoUpdate({
        target: categories.slug,
        set: { name: sub.name, parentId: rootCategory.id },
      });
  }

  console.log("Seeding locations...");
  // Cities
  const citySlugToId = new Map<string, string>();
  for (const c of uzbekistanCities) {
    const [row] = await db
      .insert(locations)
      .values({
        countryId: country.id,
        kind: "city",
        slug: c.slug,
        name: c.name,
        nameLocal: c.nameLocal,
      })
      .onConflictDoUpdate({
        target: [locations.countryId, locations.slug],
        set: { name: c.name, nameLocal: c.nameLocal },
      })
      .returning();
    citySlugToId.set(c.slug, row.id);
  }

  // Tashkent districts (parent = tashkent city)
  const tashkentId = citySlugToId.get("tashkent");
  if (!tashkentId) throw new Error("Tashkent city not seeded");
  const districtSlugToId = new Map<string, string>();
  for (const d of tashkentDistricts) {
    const [row] = await db
      .insert(locations)
      .values({
        countryId: country.id,
        parentId: tashkentId,
        kind: "district",
        slug: d.slug,
        name: d.name,
      })
      .onConflictDoUpdate({
        target: [locations.countryId, locations.slug],
        set: { parentId: tashkentId, name: d.name },
      })
      .returning();
    districtSlugToId.set(d.slug, row.id);
  }

  console.log("Seeding channels...");
  const channelUsernameToId = new Map<string, string>();
  for (const ch of seedChannels) {
    const [row] = await db
      .insert(channels)
      .values({
        username: ch.username,
        title: ch.title,
        description: ch.description,
        categoryId: rootCategory.id,
        countryId: country.id,
      })
      .onConflictDoUpdate({
        target: channels.username,
        set: {
          title: ch.title,
          description: ch.description,
          categoryId: rootCategory.id,
          countryId: country.id,
        },
      })
      .returning();
    channelUsernameToId.set(ch.username, row.id);
  }

  // Sub-category lookups (we tag each listing with the relevant sub).
  const subRows = await db
    .select()
    .from(categories)
    .where(inArray(categories.slug, subSlugs.map((s) => s.slug)));
  const subSlugToId = new Map(subRows.map((r) => [r.slug, r.id]));

  console.log(`Seeding ${seedListingTemplates.length} listings...`);
  // Clear previously-seeded listings + raw messages for these channels so the
  // script stays idempotent without leaving stale rows. Real ingested data
  // (Phase 4) lives in different channels; the seed channels are exclusive
  // to the seed pipeline.
  const seedChannelIds = Array.from(channelUsernameToId.values());
  await db
    .delete(listings)
    .where(inArray(listings.channelId, seedChannelIds));
  await db
    .delete(rawMessages)
    .where(inArray(rawMessages.channelId, seedChannelIds));

  // Insert listings deterministically. Each one gets a corresponding
  // raw_message row so the foreign-key chain is realistic for Phase 4.
  const now = Date.now();
  for (let i = 0; i < seedListingTemplates.length; i++) {
    const tpl = seedListingTemplates[i];
    const channelId = channelUsernameToId.get(tpl.channelUsername);
    if (!channelId) {
      throw new Error(
        `Seed listing references unknown channel: ${tpl.channelUsername}`,
      );
    }

    const cityId = tpl.districtSlug
      ? citySlugToId.get("tashkent")
      : citySlugToId.get(tpl.citySlug ?? "tashkent");
    const districtId = tpl.districtSlug
      ? districtSlugToId.get(tpl.districtSlug)
      : null;
    if (!cityId) throw new Error(`Unknown city for listing #${i}`);

    const subSlug =
      tpl.type === "rent"
        ? "real-estate-rent"
        : tpl.type === "sale"
          ? "real-estate-sale"
          : "real-estate-daily";
    const categoryId = subSlugToId.get(subSlug);
    if (!categoryId) throw new Error(`Unknown sub-category for ${subSlug}`);

    // Spread postedAt over the last ~30 days so feeds look realistic.
    const postedAt = new Date(now - i * 1000 * 60 * 60 * 12);

    const dedupSource = [
      tpl.channelUsername,
      tpl.type,
      tpl.title,
      tpl.priceUzs,
      tpl.contactPhones.join(","),
    ].join("|");
    const dedupHash = createHash("sha256")
      .update(dedupSource)
      .digest("hex")
      .slice(0, 32);

    // Synthetic raw message — mirrors what the Telegram worker will produce.
    const [rawRow] = await db
      .insert(rawMessages)
      .values({
        channelId,
        externalMessageId: 1_000_000 + i,
        postedAt,
        text: `${tpl.title}\n\n${tpl.description}\n\nPrice: ${tpl.priceUzs.toLocaleString()} UZS`,
        mediaUrls: pickPhotos(i),
        rawPayload: { seeded: true, templateIndex: i },
        state: "extracted",
      })
      .returning();

    await db.insert(listings).values({
      rawMessageId: rawRow.id,
      channelId,
      categoryId,
      listingType: tpl.type,
      countryId: country.id,
      cityId,
      districtId: districtId ?? null,
      price: tpl.priceUzs.toString(),
      currency: "UZS",
      priceUsd: (tpl.priceUzs / UZS_PER_USD).toFixed(2),
      title: tpl.title,
      description: tpl.description,
      language: "ru",
      contactPhones: tpl.contactPhones,
      telegramUrl: `https://t.me/${tpl.channelUsername}/${1_000_000 + i}`,
      mediaUrls: pickPhotos(i),
      attributes: {
        rooms: tpl.rooms,
        area_sqm: tpl.areaSqm,
        floor: tpl.floor,
        total_floors: tpl.totalFloors,
        furnished: tpl.furnished,
      },
      status: "active",
      postedAt,
      dedupHash,
    });
  }

  // Touch channels' last_ingested_at to reflect the seed run.
  await db
    .update(channels)
    .set({ lastIngestedAt: sql`now()` })
    .where(inArray(channels.id, seedChannelIds));

  const counts = await db
    .select({
      total: sql<number>`count(*)::int`,
    })
    .from(listings);
  console.log(`Done. Total listings in DB: ${counts[0]?.total ?? 0}`);

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
