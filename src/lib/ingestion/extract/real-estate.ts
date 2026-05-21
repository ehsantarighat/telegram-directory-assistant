import type { ExtractedListing, Extractor, ListingType } from "./types";

/**
 * Minimal regex-based real-estate extractor.
 *
 * Phase 4 will replace this with an LLM-based extractor that handles
 * Russian/Uzbek/English variations robustly. For Phase 1 this is enough
 * to demonstrate the pipeline end-to-end on the canned mock messages.
 */
export class RealEstateExtractor implements Extractor {
  readonly name = "real-estate-regex";

  extract(input: { text: string; mediaUrls: string[] }): ExtractedListing | null {
    const text = input.text.trim();
    if (!text) return null;

    const lowered = text.toLowerCase();
    const listingType: ListingType = this.detectType(lowered);

    const priceUzs = this.detectPriceUzs(text);
    const rooms = this.detectRooms(lowered);
    const areaSqm = this.detectArea(lowered);
    const floors = this.detectFloors(lowered);
    const phones = this.detectPhones(text);

    const firstLine = text.split(/\r?\n/, 1)[0] ?? text.slice(0, 80);

    return {
      listingType,
      title: firstLine.slice(0, 120),
      description: text,
      priceUzs,
      currency: priceUzs !== null ? "UZS" : null,
      contactPhones: phones,
      attributes: {
        ...(rooms !== null ? { rooms } : {}),
        ...(areaSqm !== null ? { area_sqm: areaSqm } : {}),
        ...(floors !== null ? floors : {}),
      },
      language: this.detectLanguage(text),
    };
  }

  private detectType(text: string): ListingType {
    if (/\b(посут|сутки|daily|per night|по сутк)/.test(text)) return "daily";
    if (/\b(прода|sale|sell|sotil)/.test(text)) return "sale";
    return "rent";
  }

  private detectPriceUzs(text: string): number | null {
    // Match patterns like "6 500 000 сум" / "350 000 UZS" / "1.2 млн сум"
    const millionMatch = text.match(/(\d+[.,]?\d*)\s*(млн|million|mln)\s*(?:сум|uzs|s)/i);
    if (millionMatch) {
      const m = parseFloat(millionMatch[1].replace(",", "."));
      if (Number.isFinite(m)) return Math.round(m * 1_000_000);
    }
    const rawMatch = text.match(/(\d[\d\s.,]{2,})\s*(?:сум|uzs|so'?m)/i);
    if (rawMatch) {
      const cleaned = rawMatch[1].replace(/[\s.,]/g, "");
      const n = parseInt(cleaned, 10);
      if (Number.isFinite(n) && n > 1000) return n;
    }
    return null;
  }

  private detectRooms(text: string): number | null {
    const m = text.match(/(\d)\s*(?:-)?\s*(?:комн|комнат|xona|room)/);
    return m ? parseInt(m[1], 10) : null;
  }

  private detectArea(text: string): number | null {
    const m = text.match(/(\d{1,4}(?:[.,]\d+)?)\s*(?:м[²2]|кв\.?м|sqm|m2)/);
    if (!m) return null;
    const n = parseFloat(m[1].replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }

  private detectFloors(
    text: string,
  ): { floor: number; total_floors: number } | null {
    const m = text.match(/(\d{1,2})\s*\/\s*(\d{1,2})\s*(?:этаж|qavat|floor)?/);
    if (!m) return null;
    return {
      floor: parseInt(m[1], 10),
      total_floors: parseInt(m[2], 10),
    };
  }

  private detectPhones(text: string): string[] {
    const matches = text.match(/\+?998\s?\(?\d{2}\)?\s?\d{3}[-\s]?\d{2}[-\s]?\d{2}/g);
    if (!matches) return [];
    return Array.from(
      new Set(matches.map((p) => p.replace(/[^\d+]/g, ""))),
    ).map((p) => (p.startsWith("+") ? p : `+${p}`));
  }

  private detectLanguage(text: string): string {
    if (/[а-яА-ЯЁё]/.test(text)) return "ru";
    if (/[a-zA-Z]/.test(text) && /[ʼ'`]/.test(text)) return "uz";
    if (/[a-zA-Z]/.test(text)) return "en";
    return "ru";
  }
}
