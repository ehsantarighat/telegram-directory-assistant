/**
 * Composite extractor: tries the LLM first, falls back to the
 * rule-based extractor when the LLM is unavailable or returns null.
 *
 * Failure modes that hit the fallback:
 *   - ANTHROPIC_API_KEY not configured on this deployment
 *   - LLM call timed out, rate-limited, or errored
 *   - LLM response failed schema validation
 *
 * The composite never throws — if both extractors return null, the
 * pipeline gets null and marks the raw post as `ignored`. The listing
 * is never created with garbage data because of an LLM glitch.
 */
import type { ExtractedListing, Extractor } from "./types";
import { LlmRealEstateExtractor } from "./llm";
import { RealEstateExtractor } from "./real-estate";

export class CompositeRealEstateExtractor implements Extractor {
  readonly name: string;

  constructor(
    private readonly llm: LlmRealEstateExtractor | null,
    private readonly regex: RealEstateExtractor = new RealEstateExtractor(),
  ) {
    this.name = llm ? `composite[llm,regex]` : `composite[regex]`;
  }

  async extract(input: {
    text: string;
    mediaUrls: string[];
    channelContext?: string;
  }): Promise<ExtractedListing | null> {
    if (this.llm) {
      const llmStart = Date.now();
      const out = await this.llm.extract(input);
      const llmMs = Date.now() - llmStart;
      if (out) {
        console.log(
          `[extractor] llm ok in ${llmMs}ms (${input.text.length} chars)`,
        );
        return out;
      }
      console.log(
        `[extractor] llm returned null after ${llmMs}ms; falling back to regex`,
      );
    }
    return this.regex.extract(input);
  }
}
