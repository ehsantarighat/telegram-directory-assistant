/**
 * Mock Telegram channels we pretend to ingest from. In Phase 4 the real
 * Telegram worker will resolve these usernames and populate externalId.
 */
export const seedChannels = [
  {
    username: "uz_realty_tashkent",
    title: "Tashkent Real Estate",
    description: "Apartments and houses for rent and sale across Tashkent.",
  },
  {
    username: "uz_daily_rent",
    title: "Uzbekistan Daily Rentals",
    description: "Short-term and daily apartment rentals.",
  },
  {
    username: "uz_property_sale",
    title: "UZ Property Sale",
    description: "Apartments, houses and commercial property for sale.",
  },
  {
    username: "tashkent_rooms",
    title: "Tashkent Rooms & Studios",
    description: "Studios, rooms, and shared apartments in Tashkent.",
  },
  {
    username: "samarkand_housing",
    title: "Samarkand Housing",
    description: "Residential listings across Samarkand.",
  },
] as const;
