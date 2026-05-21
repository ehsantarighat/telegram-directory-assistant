/**
 * Display labels for enum-shaped listing fields.
 */

export const listingTypeLabel = {
  rent: "Rent",
  sale: "Sale",
  daily_rent: "Daily",
} as const;

export const propertyTypeLabel = {
  apartment: "Apartment",
  house: "House",
  commercial: "Commercial",
  land: "Land",
  room: "Room",
  studio: "Studio",
} as const;

export type ListingType = keyof typeof listingTypeLabel;
export type PropertyType = keyof typeof propertyTypeLabel;

/**
 * "Tashkent · Mirabad · Magic City" → human-friendly location string.
 * Skips empty levels.
 */
export function formatLocation(input: {
  city?: string | null;
  district?: string | null;
  neighborhood?: string | null;
}): string {
  return [input.district, input.neighborhood ?? null, input.city]
    .filter((s): s is string => !!s)
    .join(" · ");
}

/**
 * Compact rooms / area / floor summary.
 *   roomsAreaFloor({rooms: 2, areaSqm: "65", floor: 4, totalFloors: 9})
 *     → "2 rooms · 65 m² · 4/9"
 */
export function formatRoomsAreaFloor(input: {
  rooms?: number | null;
  areaSqm?: string | number | null;
  floor?: number | null;
  totalFloors?: number | null;
}): string {
  const parts: string[] = [];

  if (input.rooms != null) {
    parts.push(input.rooms === 1 ? "1 room" : `${input.rooms} rooms`);
  }

  if (input.areaSqm != null && input.areaSqm !== "") {
    const n =
      typeof input.areaSqm === "number"
        ? input.areaSqm
        : parseFloat(input.areaSqm);
    if (Number.isFinite(n)) {
      const display = n % 1 === 0 ? n.toString() : n.toFixed(1);
      parts.push(`${display} m²`);
    }
  }

  if (input.floor != null) {
    parts.push(
      input.totalFloors != null
        ? `${input.floor}/${input.totalFloors}`
        : `floor ${input.floor}`,
    );
  }

  return parts.join(" · ");
}
