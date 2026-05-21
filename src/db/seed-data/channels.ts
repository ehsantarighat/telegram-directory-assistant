/**
 * Seed channels. Fictitious usernames — never resolve in real Telegram.
 * Real channels are added by admins in Phase 8.
 *
 * The username is the seed-stable key the orchestrator uses to look up
 * channel IDs when wiring raw_telegram_posts and listing_sources.
 */

export type SeedChannel = {
  username: string;
  title: string;
  url: string;
  city: string;
  language: string;
  postsImportedCount: number;
};

export const seedChannels: SeedChannel[] = [
  {
    username: "uz_realty_tashkent",
    title: "Tashkent Real Estate",
    url: "https://t.me/uz_realty_tashkent",
    city: "Tashkent",
    language: "ru",
    postsImportedCount: 1240,
  },
  {
    username: "uz_daily_rent",
    title: "Uzbekistan Daily Rentals",
    url: "https://t.me/uz_daily_rent",
    city: "Tashkent",
    language: "ru",
    postsImportedCount: 820,
  },
  {
    username: "uz_property_sale",
    title: "UZ Property Sale",
    url: "https://t.me/uz_property_sale",
    city: "Tashkent",
    language: "ru",
    postsImportedCount: 2105,
  },
  {
    username: "tashkent_rooms",
    title: "Tashkent Rooms & Studios",
    url: "https://t.me/tashkent_rooms",
    city: "Tashkent",
    language: "ru",
    postsImportedCount: 540,
  },
  {
    username: "samarkand_housing",
    title: "Samarkand Housing",
    url: "https://t.me/samarkand_housing",
    city: "Samarkand",
    language: "ru",
    postsImportedCount: 312,
  },
];
