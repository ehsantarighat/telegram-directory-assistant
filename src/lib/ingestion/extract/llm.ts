/**
 * LLM-based real-estate extractor (Anthropic Claude Haiku).
 *
 * Why this exists: rule-based extractors only know the patterns the
 * author tuned. Real channels write posts in wildly different shapes —
 * bullet templates, free prose, mixed Russian/Uzbek/English, abbreviated
 * tags, broken Cyrillic, missing fields. An LLM reads each post on its
 * own terms and projects it onto our schema regardless of format.
 *
 * Reliability: we use Anthropic's tool_use API to force structured
 * output (the model can ONLY respond by calling a tool whose input
 * schema is our target shape — no free-text JSON parsing).
 *
 * Cost discipline: re-ingestion safety in pipeline.ts prevents
 * re-charging the LLM for the same raw post. First successful sync
 * pays; every subsequent sync sees the existing listing and skips.
 *
 * Reliability fallback: any failure (rate limit, timeout, malformed
 * tool call, network) returns null. The pipeline catches that and
 * tries the rule-based extractor next. The listing never disappears
 * because the LLM hiccupped.
 */
import { z } from "zod";

import { env } from "@/lib/env";

import type {
  ExtractedListing,
  Extractor,
  ListingType,
  PropertyType,
} from "./types";

const DEFAULT_MODEL = "claude-haiku-4-5";
const ANTHROPIC_VERSION = "2023-06-01";
const TIMEOUT_MS = 30_000;

const LISTING_TYPES = ["rent", "sale", "daily_rent"] as const;
const PROPERTY_TYPES = [
  "apartment",
  "house",
  "studio",
  "room",
  "commercial",
  "land",
] as const;
const CURRENCIES = ["USD", "UZS"] as const;
const LANGUAGES = ["ru", "uz", "en", "fa", "ar"] as const;

/** The exact JSON shape we ask Claude to produce. Sent verbatim as
 *  the tool's input_schema, so the API rejects malformed responses. */
const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    listing_type: {
      type: "string",
      enum: LISTING_TYPES,
      description:
        "rent = monthly long-term rental; sale = for sale; daily_rent = посуточно / per-night",
    },
    property_type: {
      type: ["string", "null"],
      enum: [...PROPERTY_TYPES, null],
      description:
        "Use 'apartment' for any flat / квартира / ЖК / Новостройка / Вторичка. 'house' for дом / частный дом. 'studio' for студия. 'room' for a single room rental. 'commercial' for office / retail / магазин. 'land' for участок / земля. null when unclear.",
    },
    title: {
      type: "string",
      maxLength: 120,
      description:
        "Short headline. Prefer 'N-rooms · M m² · District' style if data allows. ≤120 chars.",
    },
    summary: {
      type: ["string", "null"],
      maxLength: 240,
      description:
        "Optional 1-2 sentence summary capturing district / rooms / area / condition. ≤240 chars. null if nothing additional to say.",
    },
    country: {
      type: ["string", "null"],
      description:
        "Country in English (e.g. 'Uzbekistan'). null when not stated. Default to 'Uzbekistan' only if a Tashkent district name is present.",
    },
    city: {
      type: ["string", "null"],
      description:
        "City in English (e.g. 'Tashkent', 'Samarkand'). null when not stated.",
    },
    district: {
      type: ["string", "null"],
      description:
        "Tashkent district NORMALIZED to its Latin-script Uzbek name: 'Mirzo-Ulug'bek', 'Yunusobod', 'Yashnobod', 'Yakkasaray', 'Mirobod', 'Shayxontohur', 'Chilonzor', 'Sergeli', 'Olmazor', 'Bektemir', 'Uchtepa'. For other cities, use the most common Latin transliteration. null when no district is identifiable.",
    },
    neighborhood: {
      type: ["string", "null"],
      description:
        "Sub-district / massiv / quarter / street name as written in the post (e.g. 'Лабзак', 'Юнусабад 4кв', 'улица Шота Руставели'). Keep original script. null when unstated.",
    },
    price: {
      type: ["number", "null"],
      description:
        "Numeric price as a whole number. Preserve original magnitude (don't convert currencies). E.g. '1200 у.е' → 1200. '5,000,000 сум' → 5000000. null when not stated.",
    },
    currency: {
      type: ["string", "null"],
      enum: [...CURRENCIES, null],
      description:
        "USD when the price uses $ / у.е / у.е. / USD / долл. UZS when the price uses сум / сўм / so'm / UZS. null when unclear.",
    },
    rooms: {
      type: ["integer", "null"],
      description:
        "Number of rooms as integer. Studios → 0. Hashtag forms like '#3ком' map to 3. null when not stated.",
    },
    area_sqm: {
      type: ["number", "null"],
      description:
        "Total area in square meters. Strip the unit ('м²', 'кв.м', 'sqm'). null when not stated.",
    },
    floor: {
      type: ["integer", "null"],
      description: "Floor number. null when not stated.",
    },
    total_floors: {
      type: ["integer", "null"],
      description: "Total floors in the building. null when not stated.",
    },
    furnished: {
      type: ["boolean", "null"],
      description:
        "true if explicitly furnished (с мебелью), false if explicitly unfurnished (без мебели), null otherwise.",
    },
    contact_phones: {
      type: "array",
      items: { type: "string" },
      description:
        "Phone numbers in E.164 format with + prefix and country code (e.g. '+998901234567'). Uzbekistan country code is +998. Deduplicate. Empty array when no phone is in the post.",
    },
    language: {
      type: ["string", "null"],
      enum: [...LANGUAGES, null],
      description:
        "Dominant language of the post body. ru = Russian (Cyrillic), uz = Uzbek (Latin or Cyrillic), en = English, fa = Persian, ar = Arabic.",
    },
  },
  required: [
    "listing_type",
    "title",
    "contact_phones",
  ],
} as const;

function buildSystemPrompt(channelContext?: string): string {
  return `You extract structured real-estate listing data from Telegram posts.

The posts come from public UZ (Uzbekistan) real-estate channels — primarily Tashkent rentals and sales. They are written in Russian, Uzbek (Latin or Cyrillic), or English, in formats ranging from neat bullet templates to free prose. Each post describes ONE listing.${
    channelContext
      ? `

Channel context: ${channelContext}`
      : ""
  }

Rules:
1. Read the post on its own terms. Don't assume any particular format.
2. Use null (or omit) for any field that isn't clearly stated.

LISTING TYPE — this is the most error-prone field, read carefully:
- "rent" = monthly long-term rental. Strong signals: "аренда", "сдается", "снять", "ijara", presence of a "Условия" (terms) line with "Депозит" / "предоплата", a phone-driven contact, monthly prices typically in the $200–$3000 range. Channel usernames containing "arenda" / "ijara" / "rent" mean THE ENTIRE CHANNEL is rentals.
- "sale" = for sale. Strong signals: "продается", "продажа", "sotuv", "sotil", "sotaman", much larger prices (typically $30,000+).
- "daily_rent" = nightly / по сутки. Strong signals: "посуточно", "сутки", "per night", "kunlik".
- IMPORTANT: "Вторичка" (secondary market) and "Новостройка" (new build / ЖК) describe the BUILDING AGE, NOT the listing type. Do not infer "sale" from "Вторичка" alone. Use the rent/sale/daily signals above plus the channel context to decide.
- When still unclear, default to "rent" — most UZ directory channels are rentals.

CURRENCY:
- $, у.е, у.е., USD, долл → USD
- сум, сўм, so'm, UZS → UZS

LOCATION:
- Normalize Tashkent district names to canonical Latin form: Mirzo-Ulug'bek, Yunusobod, Yashnobod, Yakkasaray, Mirobod, Shayxontohur, Chilonzor, Sergeli, Olmazor, Bektemir, Uchtepa.
- Keep neighborhoods in their original script (Cyrillic or Latin as written).

PHONES:
- Always emit E.164 with +998 country code. Strip whitespace, parentheses, dashes.

TITLE:
- Concise and informative. Prefer "{rooms}-room · {area} m² · {district}" style.

If the post is clearly NOT a real-estate listing (channel ad, congratulation, off-topic), still extract what you can but title it sensibly and leave structural fields null.

You MUST respond by calling the extract_listing tool. Do not respond with text.`;
}

const llmOutputSchema = z.object({
  listing_type: z.enum(LISTING_TYPES),
  property_type: z.enum(PROPERTY_TYPES).nullish(),
  title: z.string().min(1).max(200),
  summary: z.string().max(400).nullish(),
  country: z.string().nullish(),
  city: z.string().nullish(),
  district: z.string().nullish(),
  neighborhood: z.string().nullish(),
  price: z.number().nullish(),
  currency: z.enum(CURRENCIES).nullish(),
  rooms: z.number().int().nullish(),
  area_sqm: z.number().nullish(),
  floor: z.number().int().nullish(),
  total_floors: z.number().int().nullish(),
  furnished: z.boolean().nullish(),
  contact_phones: z.array(z.string()).default([]),
  language: z.enum(LANGUAGES).nullish(),
});

type LlmOutput = z.infer<typeof llmOutputSchema>;

export class LlmRealEstateExtractor implements Extractor {
  readonly name = "real-estate-llm-claude-haiku-4-5";

  constructor(
    private readonly apiKey: string,
    private readonly model: string = DEFAULT_MODEL,
  ) {}

  async extract(input: {
    text: string;
    mediaUrls: string[];
    channelContext?: string;
  }): Promise<ExtractedListing | null> {
    const text = input.text.trim();
    if (!text) return null;

    try {
      const parsed = await this.callAnthropic(text, input.channelContext);
      if (!parsed) return null;
      return shapeForPipeline(parsed, text);
    } catch (err) {
      console.warn(
        `[extractor:llm] call failed, deferring to fallback: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return null;
    }
  }

  /** isSync is true only when the result was synchronously available (cache).
   *  We don't currently cache; this is here for symmetry with the translation
   *  abstraction in case we add an extracted_json cache column later. */
  private async callAnthropic(
    text: string,
    channelContext?: string,
  ): Promise<LlmOutput | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": ANTHROPIC_VERSION,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1024,
          system: buildSystemPrompt(channelContext),
          tools: [
            {
              name: "extract_listing",
              description:
                "Record the structured fields extracted from the post.",
              input_schema: RESPONSE_SCHEMA,
            },
          ],
          tool_choice: { type: "tool", name: "extract_listing" },
          messages: [
            {
              role: "user",
              content: text,
            },
          ],
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(
          `Anthropic ${res.status} ${res.statusText} — ${body.slice(0, 200)}`,
        );
      }

      const json = (await res.json()) as AnthropicResponse;
      const toolUse = json.content?.find((c) => c.type === "tool_use");
      if (!toolUse || toolUse.type !== "tool_use" || !toolUse.input) {
        throw new Error("Anthropic response did not include a tool_use block");
      }
      const result = llmOutputSchema.safeParse(toolUse.input);
      if (!result.success) {
        throw new Error(
          `Tool input failed schema validation: ${result.error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; ")}`,
        );
      }
      return result.data;
    } finally {
      clearTimeout(timer);
    }
  }
}

type AnthropicContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown };

type AnthropicResponse = {
  content: AnthropicContentBlock[];
  stop_reason?: string;
  model?: string;
};

function shapeForPipeline(o: LlmOutput, originalText: string): ExtractedListing {
  return {
    listingType: o.listing_type as ListingType,
    propertyType: (o.property_type as PropertyType | undefined) ?? undefined,
    title: o.title.trim().slice(0, 120),
    summary: o.summary?.trim().slice(0, 240) ?? undefined,
    originalText,
    country: o.country ?? undefined,
    city: o.city ?? undefined,
    district: o.district ?? undefined,
    neighborhood: o.neighborhood ?? undefined,
    price: o.price ?? undefined,
    currency: (o.currency ?? undefined) as "USD" | "UZS" | undefined,
    rooms: o.rooms ?? undefined,
    areaSqm: o.area_sqm ?? undefined,
    floor: o.floor ?? undefined,
    totalFloors: o.total_floors ?? undefined,
    furnished: o.furnished ?? undefined,
    contactPhones: normalisePhones(o.contact_phones),
    language: o.language ?? undefined,
  };
}

function normalisePhones(raw: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const p of raw) {
    if (!p) continue;
    const digits = p.replace(/[^\d]/g, "");
    if (digits.length < 9) continue;
    const e164 = digits.startsWith("998")
      ? `+${digits}`
      : digits.length === 9
        ? `+998${digits}`
        : `+${digits}`;
    if (!seen.has(e164)) {
      seen.add(e164);
      out.push(e164);
    }
  }
  return out;
}

/**
 * Factory that returns the LLM extractor when ANTHROPIC_API_KEY is set,
 * or null otherwise. Used by the pipeline to decide whether to enable
 * the LLM path on this deployment.
 */
export function tryGetLlmExtractor(): LlmRealEstateExtractor | null {
  const key = env.ANTHROPIC_API_KEY;
  if (!key) return null;
  return new LlmRealEstateExtractor(key, env.ANTHROPIC_EXTRACTION_MODEL ?? DEFAULT_MODEL);
}
