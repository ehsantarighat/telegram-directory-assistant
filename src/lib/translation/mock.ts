import {
  type TargetLanguage,
  type TranslationInput,
  type TranslationOutput,
  type TranslationProvider,
  directionFor,
} from "./types";

/**
 * Deterministic placeholder translator for MVP.
 *
 * Strategy: prefix each field with a language marker so the UI clearly
 * conveys "this is a translation" without pretending we hit a real LLM.
 * Real translation slots in by swapping the export of this module.
 *
 * For Persian we add a couple of canned phrases at the top so the RTL
 * rendering is testable on listings that weren't pre-seeded.
 */
const HEADER: Record<TargetLanguage, string> = {
  en: "Translated to English (mock)",
  ru: "Перевод на русский (мок)",
  fa: "ترجمه به فارسی (نسخه آزمایشی)",
};

const FA_INTRO =
  "این آگهی به صورت خودکار و آزمایشی به فارسی برگردانده شده است. ";

export class MockTranslationProvider implements TranslationProvider {
  readonly name = "mock";

  async translate(
    input: TranslationInput,
  ): Promise<TranslationOutput | null> {
    const { targetLanguage, sourceLanguage } = input;

    // No-op if the source is already in the target language.
    if (sourceLanguage && sourceLanguage === targetLanguage) {
      return null;
    }

    const header = HEADER[targetLanguage];
    const intro = targetLanguage === "fa" ? FA_INTRO : "";

    return {
      title: `[${labelFor(targetLanguage)}] ${input.title}`,
      summary: input.summary ? `${header}: ${input.summary}` : null,
      text: input.text
        ? `${header}\n${intro}\n\n${input.text}`
        : null,
      direction: directionFor(targetLanguage),
      provider: this.name,
    };
  }
}

function labelFor(lang: TargetLanguage): string {
  return lang.toUpperCase();
}
