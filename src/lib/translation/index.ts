import { eq } from "drizzle-orm";

import { db } from "@/db";
import { listings } from "@/db/schema";

import { getCachedTranslation, putTranslation } from "./cache";
import { MockTranslationProvider } from "./mock";
import {
  type TargetLanguage,
  type TranslationProvider,
  directionFor,
} from "./types";

/**
 * Active translation provider. To swap in a real LLM:
 *   1. Implement TranslationProvider in src/lib/translation/openai.ts
 *      (or claude.ts, gemini.ts)
 *   2. Change the `provider` const below
 *   3. Existing cached rows stay valid; new rows get the new provider
 */
const provider: TranslationProvider = new MockTranslationProvider();

export type ResolvedTranslation = {
  title: string;
  summary: string | null;
  text: string | null;
  direction: "ltr" | "rtl";
  provider: string;
  cached: boolean;
};

/**
 * Get a (cached or freshly generated) translation for a listing.
 *
 * Master spec flow:
 *   1. If the user picks original → caller never calls this
 *   2. Cache lookup by (listing_id, language)
 *   3. On hit → return cached
 *   4. On miss → call provider → cache → return
 *   5. On provider failure → return null (caller falls back to original)
 */
export async function translateListing(opts: {
  listingId: string;
  language: TargetLanguage;
}): Promise<ResolvedTranslation | null> {
  const { listingId, language } = opts;

  // 1. Cache lookup
  const cached = await getCachedTranslation(listingId, language);
  if (cached && cached.title) {
    return {
      title: cached.title,
      summary: cached.summary,
      text: cached.text,
      direction: cached.direction,
      provider: cached.provider,
      cached: true,
    };
  }

  // 2. Load the source listing (title, summary, original_text, language)
  const [src] = await db
    .select({
      title: listings.title,
      summary: listings.summary,
      originalText: listings.originalText,
      detectedLanguage: listings.detectedLanguage,
    })
    .from(listings)
    .where(eq(listings.id, listingId))
    .limit(1);
  if (!src) return null;

  // 3. Same-language short-circuit — no point translating ru→ru
  if (src.detectedLanguage && src.detectedLanguage === language) {
    return null;
  }

  // 4. Call provider, swallowing errors per spec
  let output;
  try {
    output = await provider.translate({
      title: src.title,
      summary: src.summary,
      text: src.originalText,
      sourceLanguage: src.detectedLanguage ?? null,
      targetLanguage: language,
    });
  } catch (err) {
    console.error("[translation] provider failed:", err);
    return null;
  }
  if (!output) return null;

  // 5. Persist
  try {
    await putTranslation(listingId, language, output);
  } catch (err) {
    // Cache failure is non-fatal — we still want to render the translation
    // for this request. Next request will retry the cache insert.
    console.error("[translation] cache write failed:", err);
  }

  return {
    title: output.title,
    summary: output.summary,
    text: output.text,
    direction: output.direction,
    provider: output.provider,
    cached: false,
  };
}

export { directionFor };
export type { TargetLanguage };
