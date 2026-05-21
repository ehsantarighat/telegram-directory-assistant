/**
 * Per-category extraction contract.
 *
 * Each vertical (real estate, cars, jobs) implements its own extractor.
 * The pipeline picks the extractor by channel.category_id.
 *
 * For real estate, fields map 1:1 to the columns on the `listings` table.
 * Regex extractor (Phase 2) fills price / rooms / area / floor / phone.
 * AI extractor (post-MVP) fills the harder fields: property_type,
 * city / district / neighborhood, owner_or_agent, renovation_status,
 * metro_nearby, parking, balcony, elevator, pets_allowed, heating_type,
 * building_material, commission. Missing fields stay null.
 */
export type ListingType = "rent" | "sale" | "daily_rent";

export type PropertyType =
  | "apartment"
  | "house"
  | "commercial"
  | "land"
  | "room"
  | "studio";

export type ExtractedListing = {
  listingType: ListingType;
  propertyType?: PropertyType;

  title: string;
  summary?: string;
  originalText?: string;

  country?: string;
  city?: string;
  district?: string;
  neighborhood?: string;

  price?: number;
  currency?: "UZS" | "USD";

  rooms?: number;
  areaSqm?: number;
  floor?: number;
  totalFloors?: number;
  furnished?: boolean;

  contactPhones: string[];

  language?: string;
};

export interface Extractor {
  readonly name: string;
  extract(input: {
    text: string;
    mediaUrls: string[];
  }): ExtractedListing | null;
}
