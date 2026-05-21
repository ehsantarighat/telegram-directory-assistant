/**
 * Translation provider contract.
 *
 * MVP ships a MockTranslationProvider that returns marked-up text for
 * demonstration. Phase-post-MVP swaps in a real provider (OpenAI,
 * Claude, Gemini) without touching consumers — they all implement this
 * interface.
 *
 * Implementations MUST:
 *   - Be pure (same input → same output) where practical, so caches stay
 *     consistent across runs.
 *   - Never throw. Return null on failure; the caller falls back to the
 *     original text. (Master spec: "Translation failure falls back safely")
 *   - Set `direction` to 'rtl' for Persian (fa), 'ltr' for en/ru.
 */

export type TargetLanguage = "en" | "ru" | "fa";

export type TranslationDirection = "ltr" | "rtl";

export type TranslationInput = {
  title: string;
  summary?: string | null;
  text?: string | null;
  sourceLanguage?: string | null;
  targetLanguage: TargetLanguage;
};

export type TranslationOutput = {
  title: string;
  summary: string | null;
  text: string | null;
  direction: TranslationDirection;
  provider: string;
};

export interface TranslationProvider {
  readonly name: string;
  translate(input: TranslationInput): Promise<TranslationOutput | null>;
}

export function directionFor(lang: TargetLanguage): TranslationDirection {
  return lang === "fa" ? "rtl" : "ltr";
}

export const LANGUAGE_LABELS: Record<TargetLanguage, string> = {
  en: "English",
  ru: "Russian",
  fa: "Persian",
};
