import type {
  ExtractedListing,
  Extractor,
  ListingType,
  PropertyType,
} from "./types";

/**
 * Regex-based real-estate extractor for Phase 2.
 *
 * Handles the obvious fields (price, rooms, area, floor, phone, language)
 * across Russian / Uzbek / English source text. Harder fields
 * (property_type beyond apartment/house heuristics, district, owner_or_agent,
 * amenities) wait for the AI extractor in Phase 10.
 *
 * Returns null for empty input only; otherwise always produces something
 * (the pipeline + extraction_confidence_json will mark low-confidence
 * fields once that's wired).
 */
export class RealEstateExtractor implements Extractor {
  readonly name = "real-estate-regex";

  extract(input: {
    text: string;
    mediaUrls: string[];
  }): ExtractedListing | null {
    const text = input.text.trim();
    if (!text) return null;

    const lowered = text.toLowerCase();

    const listingType = this.detectListingType(lowered);
    const propertyType = this.detectPropertyType(lowered);
    const price = this.detectPrice(text);
    const rooms = this.detectRooms(lowered);
    const areaSqm = this.detectArea(lowered);
    const floors = this.detectFloors(lowered);
    const phones = this.detectPhones(text);
    const furnished = this.detectFurnished(lowered);

    const firstLine = text.split(/\r?\n/, 1)[0] ?? text.slice(0, 80);

    return {
      listingType,
      propertyType,
      title: firstLine.slice(0, 120),
      summary: text.length > 120 ? text.slice(0, 240) : undefined,
      originalText: text,
      price: price?.amount,
      currency: price?.currency,
      rooms: rooms ?? undefined,
      areaSqm: areaSqm ?? undefined,
      floor: floors?.floor,
      totalFloors: floors?.totalFloors,
      furnished,
      contactPhones: phones,
      language: this.detectLanguage(text),
    };
  }

  private detectListingType(text: string): ListingType {
    if (/\b(посут|сутки|daily|per night|по сутк|кунлик)/.test(text))
      return "daily_rent";
    if (/\b(прода|sale|sell|sotil|сот)/.test(text)) return "sale";
    return "rent";
  }

  private detectPropertyType(text: string): PropertyType | undefined {
    if (/\b(студи|studio)/.test(text)) return "studio";
    if (/\b(дом|house|uy)/.test(text)) return "house";
    if (/\b(комнат|room|xona).{0,12}\b(сда|снять|поиск|без)/.test(text))
      return "room";
    if (/\b(офис|office|magazin|комм|commercial)/.test(text))
      return "commercial";
    if (/\b(участ|земл|land|yer)/.test(text)) return "land";
    if (/\b(кварт|apartment|квартира|kvartira)/.test(text))
      return "apartment";
    return undefined;
  }

  private detectPrice(
    text: string,
  ): { amount: number; currency: "UZS" | "USD" } | undefined {
    // "1 200 USD" / "$700"
    const usdMatch = text.match(
      /(?:\$\s*|usd\s*|долл[а-я]*\s*)?(\d[\d\s.,]{2,})\s*(?:usd|долл|\$)/i,
    );
    if (usdMatch) {
      const n = this.parseAmount(usdMatch[1]);
      if (n) return { amount: n, currency: "USD" };
    }
    const dollarPrefixMatch = text.match(/\$\s*(\d[\d\s.,]{2,})/);
    if (dollarPrefixMatch) {
      const n = this.parseAmount(dollarPrefixMatch[1]);
      if (n) return { amount: n, currency: "USD" };
    }

    // "1.2 млн сум" / "6 500 000 сум" / "350 000 UZS"
    const millionMatch = text.match(
      /(\d+[.,]?\d*)\s*(?:млн|million|mln)\s*(?:сум|uzs|so'?m)/i,
    );
    if (millionMatch) {
      const m = parseFloat(millionMatch[1].replace(",", "."));
      if (Number.isFinite(m))
        return { amount: Math.round(m * 1_000_000), currency: "UZS" };
    }
    const uzsMatch = text.match(/(\d[\d\s.,]{2,})\s*(?:сум|uzs|so'?m)/i);
    if (uzsMatch) {
      const n = this.parseAmount(uzsMatch[1]);
      if (n) return { amount: n, currency: "UZS" };
    }

    return undefined;
  }

  private parseAmount(raw: string): number | null {
    const cleaned = raw.replace(/[\s.,]/g, "");
    const n = parseInt(cleaned, 10);
    return Number.isFinite(n) && n > 100 ? n : null;
  }

  private detectRooms(text: string): number | null {
    const m = text.match(/(\d)\s*-?\s*(?:комн|комнат|xona|room|комнатн)/);
    return m ? parseInt(m[1], 10) : null;
  }

  private detectArea(text: string): number | null {
    const m = text.match(
      /(\d{2,4}(?:[.,]\d+)?)\s*(?:м[²2]|кв\.?\s*м|sqm|m2|кв\.?\s*метр)/,
    );
    if (!m) return null;
    const n = parseFloat(m[1].replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }

  private detectFloors(
    text: string,
  ): { floor: number; totalFloors: number } | null {
    const m = text.match(/(\d{1,2})\s*\/\s*(\d{1,2})\s*(?:этаж|qavat|floor)?/);
    if (!m) return null;
    return {
      floor: parseInt(m[1], 10),
      totalFloors: parseInt(m[2], 10),
    };
  }

  private detectPhones(text: string): string[] {
    const matches = text.match(
      /\+?998\s?\(?\d{2}\)?\s?\d{3}[-\s]?\d{2}[-\s]?\d{2}/g,
    );
    if (!matches) return [];
    return Array.from(
      new Set(matches.map((p) => p.replace(/[^\d+]/g, ""))),
    ).map((p) => (p.startsWith("+") ? p : `+${p}`));
  }

  private detectFurnished(text: string): boolean | undefined {
    if (/\b(с\s*мебел|furnished|мебелированн|jihozli)/.test(text)) return true;
    if (/\b(без\s*мебел|unfurnished|jihozsiz)/.test(text)) return false;
    return undefined;
  }

  private detectLanguage(text: string): string {
    if (/[а-яА-ЯЁё]/.test(text)) return "ru";
    if (/[a-zA-Z]/.test(text) && /[ʼ'`]/.test(text)) return "uz";
    if (/[a-zA-Z]/.test(text)) return "en";
    return "ru";
  }
}
