import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { listingTranslations } from "@/db/schema";
import type { TargetLanguage, TranslationOutput } from "./types";

export type CachedTranslation = {
  title: string | null;
  summary: string | null;
  text: string | null;
  direction: "ltr" | "rtl";
  provider: string;
};

/**
 * Read a cached translation for (listingId, language). Null on miss.
 */
export async function getCachedTranslation(
  listingId: string,
  language: TargetLanguage,
): Promise<CachedTranslation | null> {
  const rows = await db
    .select({
      title: listingTranslations.translatedTitle,
      summary: listingTranslations.translatedSummary,
      text: listingTranslations.translatedText,
      direction: listingTranslations.direction,
      provider: listingTranslations.provider,
    })
    .from(listingTranslations)
    .where(
      and(
        eq(listingTranslations.listingId, listingId),
        eq(listingTranslations.language, language),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Persist a provider's output. Upserts on the (listing_id, language)
 * unique constraint so retries with a better provider overwrite the
 * cache cleanly.
 */
export async function putTranslation(
  listingId: string,
  language: TargetLanguage,
  output: TranslationOutput,
): Promise<void> {
  await db
    .insert(listingTranslations)
    .values({
      listingId,
      language,
      translatedTitle: output.title,
      translatedSummary: output.summary,
      translatedText: output.text,
      direction: output.direction,
      provider: output.provider,
    })
    .onConflictDoUpdate({
      target: [listingTranslations.listingId, listingTranslations.language],
      set: {
        translatedTitle: output.title,
        translatedSummary: output.summary,
        translatedText: output.text,
        direction: output.direction,
        provider: output.provider,
        updatedAt: new Date(),
      },
    });
}
