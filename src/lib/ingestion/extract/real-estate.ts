import type {
  ExtractedListing,
  Extractor,
  ListingType,
  PropertyType,
} from "./types";

/**
 * Real-estate extractor.
 *
 * Most professional UZ real-estate channels post in a structured
 * bullet-point format like:
 *
 *     ID #info komoliddin
 *     #Шота Руставели | #3ком | #1200 у.е
 *
 *     • Новостройка: ЖК Luminar hous
 *     • Адрес: Яккасарайский район, улица Шота Руставели
 *     • Ориентир: Текстильные больница
 *     • Количество комнат: 3
 *     • Этаж: 4
 *     • Этажность дома: 9
 *     • Площадь: 70 м²
 *     • Состояние: Евроремонт
 *     • Цена: 1200 у.е
 *     • Условия: Депозит либо предоплата
 *     • Телефон: +998931850400
 *
 * For these posts we lift each field straight off the matching label.
 *
 * For unstructured posts (older / amateur channels) we fall back to
 * the regex heuristics that used to be the only path. The two layers
 * combine — structured value wins, regex fills gaps.
 *
 * Spec covers Russian labels (the dominant language in UZ real estate),
 * Uzbek-Latin variants, and English. Persian/Arabic are read-only
 * (translation layer handles those).
 */
export class RealEstateExtractor implements Extractor {
  readonly name = "real-estate-v2";

  extract(input: {
    text: string;
    mediaUrls: string[];
  }): ExtractedListing | null {
    const text = input.text.trim();
    if (!text) return null;

    const fields = parseBulletFields(text);
    const lowered = text.toLowerCase();

    const listingType = detectListingType(lowered, fields);
    const price = detectPrice(text, fields);
    const rooms = detectRooms(lowered, fields);
    const areaSqm = detectArea(lowered, fields);
    const floors = detectFloors(lowered, fields);
    const phones = detectPhones(text, fields);
    const furnished = detectFurnished(lowered, fields);
    const location = detectLocation(text, fields);
    const language = detectLanguage(text);
    // Property-type detection sees both explicit signals AND the structural
    // shape of the post (rooms + area + floor → almost certainly apartment).
    const propertyType =
      detectPropertyType(lowered, fields) ??
      (rooms && areaSqm && floors?.totalFloors ? "apartment" : undefined);

    const title = buildTitle({
      rooms,
      areaSqm,
      district: location.district ?? location.neighborhood,
      price,
      listingType,
      fallback: text,
    });
    const summary = buildSummary({
      district: location.district,
      neighborhood: location.neighborhood,
      rooms,
      areaSqm,
      floor: floors?.floor,
      totalFloors: floors?.totalFloors,
      condition: fields.condition,
      fallback: text,
    });

    return {
      listingType,
      propertyType,
      title,
      summary,
      originalText: text,
      country: location.country,
      city: location.city,
      district: location.district,
      neighborhood: location.neighborhood,
      price: price?.amount,
      currency: price?.currency,
      rooms: rooms ?? undefined,
      areaSqm: areaSqm ?? undefined,
      floor: floors?.floor,
      totalFloors: floors?.totalFloors,
      furnished,
      contactPhones: phones,
      language,
    };
  }
}

// ---------- bullet-field parser ----------

/**
 * A canonical bag of fields we look for. Each entry is a regex of
 * label aliases (Russian primary, Uzbek-Latin & English fallbacks).
 * The label match is case-insensitive and tolerates the bullet
 * character that precedes it.
 */
type ParsedFields = {
  rooms?: string;
  floor?: string;
  totalFloors?: string;
  area?: string;
  price?: string;
  phone?: string;
  address?: string;
  landmark?: string;
  condition?: string;
  newBuild?: string;
  secondary?: string;
  terms?: string;
  type?: string;
};

const LABELS: { key: keyof ParsedFields; aliases: string[] }[] = [
  { key: "rooms", aliases: ["Количество комнат", "Комнат", "Xonalar", "Rooms"] },
  { key: "floor", aliases: ["Этаж", "Qavat", "Floor"] },
  {
    key: "totalFloors",
    aliases: ["Этажность дома", "Этажей", "Qavatlik", "Total floors"],
  },
  { key: "area", aliases: ["Площадь", "Maydon", "Area"] },
  { key: "price", aliases: ["Цена", "Narx", "Price"] },
  { key: "phone", aliases: ["Телефон", "Telefon", "Phone", "Tel"] },
  { key: "address", aliases: ["Адрес", "Manzil", "Address"] },
  { key: "landmark", aliases: ["Ориентир", "Mo'ljal", "Landmark"] },
  { key: "condition", aliases: ["Состояние", "Holati", "Condition"] },
  { key: "newBuild", aliases: ["Новостройка", "Yangi bino", "New build"] },
  { key: "secondary", aliases: ["Вторичка", "Ikkilamchi", "Secondary"] },
  { key: "terms", aliases: ["Условия", "Shartlar", "Terms"] },
  { key: "type", aliases: ["Тип", "Turi", "Type"] },
];

function parseBulletFields(text: string): ParsedFields {
  const out: ParsedFields = {};
  // Match either bullet-prefixed (• Label: value) or plain (Label: value)
  // lines. Value runs to end-of-line.
  for (const { key, aliases } of LABELS) {
    const alt = aliases.map(escapeRegex).join("|");
    const re = new RegExp(
      String.raw`(?:^|[\n•·\-▪️])\s*(?:${alt})\s*[:：]\s*(.+?)\s*(?:\n|$)`,
      "im",
    );
    const m = re.exec(text);
    if (m && m[1]) {
      const value = m[1].trim();
      if (value.length > 0) out[key] = value;
    }
  }
  return out;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------- field detectors ----------

function detectListingType(text: string, fields: ParsedFields): ListingType {
  const haystack = `${text} ${fields.type ?? ""} ${fields.terms ?? ""}`.toLowerCase();
  if (/(посут|сутки|daily|per night|по\s*сутк|кунлик)/.test(haystack))
    return "daily_rent";
  if (/(прода[жмюя]|sale|sell|sotil|sotuv|sotaman|сот[аи]лад|для\s*прода)/.test(haystack))
    return "sale";
  // Default to rent — `arenda` channels and most directories are rentals
  return "rent";
}

function detectPropertyType(
  text: string,
  fields: ParsedFields,
): PropertyType | undefined {
  const haystack = `${text} ${fields.type ?? ""} ${fields.newBuild ?? ""} ${fields.secondary ?? ""}`.toLowerCase();
  if (/(студи|studio)/.test(haystack)) return "studio";
  if (/(коммерч|офис|office|magazin|commercial|tijorat)/.test(haystack))
    return "commercial";
  if (/(участ|земл|land|yer)/.test(haystack)) return "land";
  if (/(\bдом\b|house|\buy\b|tomli)/.test(haystack)) return "house";
  if (/(комнат[аы]\b|room|xona)/.test(haystack) && !/количество\s*комнат/.test(haystack))
    return "room";
  // Any explicit apartment / новостройка / вторичка / ЖК signal → apartment
  if (
    /(кварт|apartment|kvartira|новостр|вторичк|жк\b|\bжк\s)/.test(haystack) ||
    fields.newBuild ||
    fields.secondary
  )
    return "apartment";
  return undefined;
}

type Price = { amount: number; currency: "UZS" | "USD" };

function detectPrice(text: string, fields: ParsedFields): Price | undefined {
  if (fields.price) {
    const fromField = parsePriceString(fields.price);
    if (fromField) return fromField;
  }
  // No explicit "Цена:" field — try the leading hashtag row like "#1200 у.е" or "$ 1100"
  const tagLine = text.split(/\n/).slice(0, 3).join(" ");
  const fromTags = parsePriceString(tagLine);
  if (fromTags) return fromTags;
  // Last resort: scan body
  return parsePriceString(text);
}

const USD_TOKEN = /(\$|у\.?\s?е\.?|usd|долл[а-яё]*|dollar)/i;
const UZS_TOKEN = /(сум|сўм|so'?m|uzs)/i;

function parsePriceString(s: string): Price | undefined {
  // Find a number that's adjacent to either a USD or UZS token, prefer USD.
  // We look at the FIRST number that has a currency marker within ~15 chars
  // either side of it.
  //
  // Two shapes for the number itself, in priority order:
  //   - thousand-separated:  1,200 / 5 000 000 / 5.000.000
  //   - plain digit run:     1000 / 750
  // Putting the thousand-separated branch first prevents `1000` from being
  // truncated to `100` by the `\d{1,3}` head of the separator branch.
  const numRe = /((?:\d{1,3}(?:[\s.,]\d{3})+|\d+)(?:[.,]\d+)?)/g;
  let m: RegExpExecArray | null;
  let best: Price | undefined;
  while ((m = numRe.exec(s)) !== null) {
    const raw = m[1];
    const value = parseAmount(raw);
    if (!value) continue;
    const start = Math.max(0, m.index - 15);
    const end = Math.min(s.length, m.index + raw.length + 15);
    const window = s.slice(start, end);
    if (USD_TOKEN.test(window)) {
      // USD prices are typically 50–50000
      if (value >= 50 && value <= 200_000) {
        best = { amount: value, currency: "USD" };
        break;
      }
    }
    if (!best && UZS_TOKEN.test(window)) {
      // "1.2 млн сум" pattern
      const mln = /(\d+[.,]?\d*)\s*(?:млн|million|mln)/i.exec(window);
      if (mln) {
        const f = parseFloat(mln[1].replace(",", "."));
        if (Number.isFinite(f))
          best = { amount: Math.round(f * 1_000_000), currency: "UZS" };
      } else if (value >= 100_000) {
        best = { amount: value, currency: "UZS" };
      }
    }
  }
  return best;
}

function parseAmount(raw: string): number | null {
  // Handle "1.200" / "1,200" / "1 200" thousands separators.
  // If the only separator is a single comma/period followed by 1–2 digits AND
  // the number is small, it's a decimal — otherwise it's a thousands sep.
  const stripped = raw.replace(/\s/g, "");
  const decimalMatch = /^(\d+)[.,](\d{1,2})$/.exec(stripped);
  if (decimalMatch) {
    const n = parseFloat(`${decimalMatch[1]}.${decimalMatch[2]}`);
    return Number.isFinite(n) ? n : null;
  }
  const cleaned = stripped.replace(/[.,]/g, "");
  const n = parseInt(cleaned, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function detectRooms(text: string, fields: ParsedFields): number | null {
  if (fields.rooms) {
    const m = /(\d+)/.exec(fields.rooms);
    if (m) return parseInt(m[1], 10);
  }
  // Hashtag form: "#3ком" / "#2-комн"
  const tag = /#\s*(\d+)\s*-?\s*комн?/i.exec(text);
  if (tag) return parseInt(tag[1], 10);
  const body = /(\d+)\s*-?\s*(?:комн|комнат|xona|room|комнатн)/i.exec(text);
  return body ? parseInt(body[1], 10) : null;
}

function detectArea(text: string, fields: ParsedFields): number | null {
  const src = fields.area ?? text;
  const m =
    /(\d{2,4}(?:[.,]\d+)?)\s*(?:м[²2]|кв\.?\s*м|sqm|m2|кв\.?\s*метр|м\.?кв)/i.exec(
      src,
    );
  if (!m) return null;
  const n = parseFloat(m[1].replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function detectFloors(
  text: string,
  fields: ParsedFields,
): { floor?: number; totalFloors?: number } | null {
  let floor: number | undefined;
  let total: number | undefined;
  if (fields.floor) {
    const m = /(\d+)/.exec(fields.floor);
    if (m) floor = parseInt(m[1], 10);
  }
  if (fields.totalFloors) {
    const m = /(\d+)/.exec(fields.totalFloors);
    if (m) total = parseInt(m[1], 10);
  }
  if (floor !== undefined || total !== undefined)
    return { floor, totalFloors: total };

  // "2/9" or "2 из 9" style
  const m = /(\d{1,2})\s*(?:\/|из|of)\s*(\d{1,2})\s*(?:этаж|qavat|floor)?/i.exec(
    text,
  );
  if (m) {
    return { floor: parseInt(m[1], 10), totalFloors: parseInt(m[2], 10) };
  }
  return null;
}

function detectPhones(text: string, fields: ParsedFields): string[] {
  const src = `${fields.phone ?? ""}\n${text}`;
  const matches = src.match(
    /\+?998[\s\-()]*\d{2}[\s\-()]*\d{3}[\s\-()]*\d{2}[\s\-()]*\d{2}/g,
  );
  if (!matches) return [];
  return Array.from(
    new Set(
      matches.map((p) => {
        const digits = p.replace(/[^\d]/g, "");
        return digits.startsWith("998") ? `+${digits}` : `+998${digits}`;
      }),
    ),
  );
}

function detectFurnished(text: string, fields: ParsedFields): boolean | undefined {
  const haystack = `${text} ${fields.terms ?? ""} ${fields.condition ?? ""}`.toLowerCase();
  if (/(с\s*мебел|с\s*мебелью|furnished|мебелированн|jihozli)/.test(haystack))
    return true;
  if (/(без\s*мебел|unfurnished|jihozsiz)/.test(haystack)) return false;
  return undefined;
}

function detectLanguage(text: string): string {
  if (/[а-яА-ЯЁё]/.test(text)) return "ru";
  if (/[ʼ'`]/.test(text) && /[a-zA-Z]/.test(text)) return "uz";
  if (/[a-zA-Z]/.test(text)) return "en";
  return "ru";
}

// ---------- location ----------

// Tashkent district patterns. Each regex covers both the adjective form
// ("Мирзо-улугбекский") that addresses normally use AND the bare noun
// form ("Мирзо Улугбек") that some posts use when the channel writer
// shortened the address.
const TASHKENT_DISTRICTS = [
  { rx: /мирзо[-\s]?улугбек/i, name: "Mirzo-Ulug'bek" },
  { rx: /юнусабад/i, name: "Yunusobod" },
  { rx: /яшнабад/i, name: "Yashnobod" },
  { rx: /яккасарай/i, name: "Yakkasaray" },
  { rx: /мирабад/i, name: "Mirobod" },
  { rx: /шайх[ао]н(?:то|та)хур/i, name: "Shayxontohur" },
  { rx: /чил[ао]нзор|чиланзар/i, name: "Chilonzor" },
  { rx: /сергел[ий]/i, name: "Sergeli" },
  { rx: /(?:алмазар|олмазор)/i, name: "Olmazor" },
  { rx: /бектемир/i, name: "Bektemir" },
  { rx: /учтепа/i, name: "Uchtepa" },
];

function detectLocation(
  text: string,
  fields: ParsedFields,
): {
  country?: string;
  city?: string;
  district?: string;
  neighborhood?: string;
} {
  const source = `${fields.address ?? ""}\n${text}`;

  for (const d of TASHKENT_DISTRICTS) {
    if (d.rx.test(source)) {
      // Try to also pull a neighborhood from after the district name in
      // the address line: "Шайхантахурский район, Лабзак"
      const neighborhood = extractNeighborhood(fields.address);
      return {
        country: "Uzbekistan",
        city: "Tashkent",
        district: d.name,
        neighborhood,
      };
    }
  }

  // No district matched — still try to grab anything after a comma in the
  // address field as the neighborhood.
  const neighborhood = extractNeighborhood(fields.address);
  return {
    country: neighborhood ? "Uzbekistan" : undefined,
    city: neighborhood ? "Tashkent" : undefined,
    district: undefined,
    neighborhood,
  };
}

function extractNeighborhood(address: string | undefined): string | undefined {
  if (!address) return undefined;
  // "Шайхантахурский район, Лабзак" → "Лабзак"
  const m = /район\s*[,;]\s*([^\n,;]+)/i.exec(address);
  if (m) return m[1].trim();
  // "Mirabad district, Nukus St." style
  const m2 = /district\s*[,;]\s*([^\n,;]+)/i.exec(address);
  if (m2) return m2[1].trim();
  // If the address starts with a non-district token, take the first segment
  const parts = address.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
  return parts.length === 1 ? parts[0] : undefined;
}

// ---------- title / summary ----------

function buildTitle(opts: {
  rooms: number | null;
  areaSqm: number | null;
  district: string | undefined;
  price: Price | undefined;
  listingType: ListingType;
  fallback: string;
}): string {
  const parts: string[] = [];
  if (opts.rooms) parts.push(`${opts.rooms}-комн`);
  if (opts.areaSqm) parts.push(`${Math.round(opts.areaSqm)} м²`);
  if (opts.district) parts.push(opts.district);
  if (parts.length === 0) {
    // Last resort: first non-tag, non-id line of the source text
    const firstUseful = opts.fallback
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find(
        (l) => l.length > 0 && !l.startsWith("#") && !l.toLowerCase().startsWith("id"),
      );
    return (firstUseful ?? opts.fallback.slice(0, 80)).slice(0, 120);
  }
  return parts.join(" · ").slice(0, 120);
}

function buildSummary(opts: {
  district: string | undefined;
  neighborhood: string | undefined;
  rooms: number | null;
  areaSqm: number | null;
  floor: number | undefined;
  totalFloors: number | undefined;
  condition: string | undefined;
  fallback: string;
}): string | undefined {
  const bits: string[] = [];
  const loc = [opts.district, opts.neighborhood].filter(Boolean).join(", ");
  if (loc) bits.push(loc);
  if (opts.rooms) bits.push(`${opts.rooms}-комн`);
  if (opts.areaSqm) bits.push(`${Math.round(opts.areaSqm)} м²`);
  if (opts.floor && opts.totalFloors)
    bits.push(`${opts.floor}/${opts.totalFloors} этаж`);
  else if (opts.floor) bits.push(`${opts.floor} этаж`);
  if (opts.condition) bits.push(opts.condition);
  if (bits.length === 0) {
    const text = opts.fallback.trim();
    return text.length > 240 ? `${text.slice(0, 237)}…` : text;
  }
  return bits.join(" · ");
}
