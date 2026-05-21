/**
 * Per-category extraction contract.
 *
 * An Extractor takes a raw message text + media and returns a partial
 * Listing payload (or null if the message doesn't look like a real listing).
 *
 * Each vertical (real estate, cars, jobs) implements its own extractor.
 * The pipeline picks the extractor by channel.category_id.
 */
export type ListingType = "rent" | "sale" | "daily";

export type ExtractedListing = {
  listingType: ListingType;
  title: string;
  description: string;
  priceUzs: number | null;
  currency: "UZS" | "USD" | null;
  contactPhones: string[];
  attributes: {
    rooms?: number;
    area_sqm?: number;
    floor?: number;
    total_floors?: number;
    furnished?: boolean;
    [key: string]: unknown;
  };
  language?: string;
};

export interface Extractor {
  readonly name: string;
  extract(input: {
    text: string;
    mediaUrls: string[];
  }): ExtractedListing | null;
}
