import { fetchListings } from "./query";
import type { ListingDetail, ListingsListItem } from "./query";

/**
 * "You might also like" — return up to N listings similar to the one
 * the user is viewing. Similarity is tiered:
 *
 *   Tier 1: same city + same listing type + same district
 *           + price within ±30%      (best match — narrow area & budget)
 *   Tier 2: same city + same listing type + price within ±30%
 *           (any district)            (widens to budget-match anywhere in city)
 *   Tier 3: same city + same listing type
 *           (any price)               (fills remaining slots from the city)
 *
 * Each tier dedupes against the current listing AND against previously
 * found recommendations. We stop as soon as we have `limit` items.
 *
 * Returns [] for listings without a city — we can't recommend by
 * geography alone if we don't know where it is.
 */
export async function fetchRecommendations(
  forListing: ListingDetail,
  limit = 6,
): Promise<ListingsListItem[]> {
  if (!forListing.city) return [];

  const priceNum = forListing.price ? parseFloat(forListing.price) : null;
  const sameCurrency = forListing.currency ?? undefined;
  const baseFilters = {
    city: forListing.city,
    type: forListing.listingType,
    currency: sameCurrency,
    sort: "newest" as const,
  };

  const collected: ListingsListItem[] = [];
  const seen = new Set<string>([forListing.id]);

  const accept = (items: ListingsListItem[]) => {
    for (const item of items) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      collected.push(item);
      if (collected.length >= limit) break;
    }
  };

  // Tier 1: same district + similar price
  if (forListing.district && priceNum) {
    const page = await fetchListings({
      ...baseFilters,
      district: forListing.district,
      minPrice: priceNum * 0.7,
      maxPrice: priceNum * 1.3,
      limit,
    });
    accept(page.items);
  }

  // Tier 2: same city + similar price (broaden to any district)
  if (collected.length < limit && priceNum) {
    const page = await fetchListings({
      ...baseFilters,
      minPrice: priceNum * 0.7,
      maxPrice: priceNum * 1.3,
      limit: limit * 2,
    });
    accept(page.items);
  }

  // Tier 3: same city + same listing type (fill any leftover slots)
  if (collected.length < limit) {
    const page = await fetchListings({ ...baseFilters, limit: limit * 2 });
    accept(page.items);
  }

  return collected.slice(0, limit);
}
