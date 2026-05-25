/**
 * Maps a URLSearchParams instance to/from the structured filter object
 * the FiltersDrawer + SearchBar + SortSelect use.
 *
 * Keys mirror the listingsQuerySchema names so the URL roundtrips
 * cleanly into our server query.
 */

export type FilterState = {
  // Primary
  q?: string;
  type?: "rent" | "sale" | "daily_rent";
  propertyType?:
    | "apartment"
    | "house"
    | "commercial"
    | "land"
    | "room"
    | "studio";
  // City and district are multi-select. Empty array == "no filter".
  // URL format: comma-separated single key, e.g.
  // ?city=Tashkent,Samarkand&district=Mirobod,Yunusabad
  // (chosen over repeated keys to keep the URL shorter and to avoid
  // touching flatten() in the page which collapses arrays.)
  city?: string[];
  district?: string[];
  channelUsername?: string;

  // Money
  minPrice?: string;
  maxPrice?: string;
  currency?: string;

  // Size
  rooms?: string;
  minAreaSqm?: string;
  maxAreaSqm?: string;
  floor?: string;
  totalFloors?: string;

  // Booleans
  hasPhotos?: boolean;
  furnished?: boolean;
  newBuilding?: boolean;
  metroNearby?: boolean;
  parking?: boolean;
  balcony?: boolean;
  elevator?: boolean;
  petsAllowed?: boolean;

  // Advanced text
  renovationStatus?: string;
  heatingType?: string;
  buildingMaterial?: string;
  ownerOrAgent?: "owner" | "agent";

  // Order
  sort?: "newest" | "price_asc" | "price_desc" | "most_saved";
};

const STRING_KEYS = [
  "q",
  "type",
  "propertyType",
  "channelUsername",
  "minPrice",
  "maxPrice",
  "currency",
  "rooms",
  "minAreaSqm",
  "maxAreaSqm",
  "floor",
  "totalFloors",
  "renovationStatus",
  "heatingType",
  "buildingMaterial",
  "ownerOrAgent",
  "sort",
] as const;

// Multi-value keys serialized as comma-separated strings.
const ARRAY_KEYS = ["city", "district"] as const;

const BOOLEAN_KEYS = [
  "hasPhotos",
  "furnished",
  "newBuilding",
  "metroNearby",
  "parking",
  "balcony",
  "elevator",
  "petsAllowed",
] as const;

export function parseFilters(
  params: URLSearchParams | Record<string, string | undefined>,
): FilterState {
  const get = (k: string): string | undefined => {
    if (params instanceof URLSearchParams) return params.get(k) ?? undefined;
    return params[k];
  };

  const state: FilterState = {};
  for (const key of STRING_KEYS) {
    const v = get(key);
    if (v && v.length > 0) {
      (state as Record<string, unknown>)[key] = v;
    }
  }
  for (const key of ARRAY_KEYS) {
    const v = get(key);
    if (v && v.length > 0) {
      const arr = v
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      if (arr.length > 0) {
        (state as Record<string, unknown>)[key] = arr;
      }
    }
  }
  for (const key of BOOLEAN_KEYS) {
    const v = get(key);
    if (v === "1" || v === "true") {
      (state as Record<string, unknown>)[key] = true;
    } else if (v === "0" || v === "false") {
      (state as Record<string, unknown>)[key] = false;
    }
  }
  return state;
}

export function serializeFilters(state: FilterState): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of STRING_KEYS) {
    const v = state[key];
    if (v != null && String(v).length > 0) params.set(key, String(v));
  }
  for (const key of ARRAY_KEYS) {
    const v = state[key];
    if (Array.isArray(v) && v.length > 0) {
      params.set(key, v.join(","));
    }
  }
  for (const key of BOOLEAN_KEYS) {
    const v = state[key];
    if (v === true) params.set(key, "1");
    if (v === false) params.set(key, "0");
  }
  return params;
}

/** Count "user-set" filters (excludes sort which is always set) */
export function countActiveFilters(state: FilterState): number {
  let n = 0;
  for (const key of STRING_KEYS) {
    if (key === "sort") continue;
    if (state[key] != null && String(state[key]).length > 0) n++;
  }
  for (const key of ARRAY_KEYS) {
    const v = state[key];
    // Each selected value is a separate filter from the user's
    // perspective (and increments the badge count individually).
    if (Array.isArray(v)) n += v.length;
  }
  for (const key of BOOLEAN_KEYS) {
    if (state[key] != null) n++;
  }
  return n;
}
