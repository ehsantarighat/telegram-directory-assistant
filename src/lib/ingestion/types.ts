/**
 * Ingestion contracts.
 *
 * Anything that produces external messages (Telegram channels in Phase 4,
 * web scrapers later, manual submissions, etc.) implements `IngestionSource`.
 * The pipeline (run.ts) is source-agnostic.
 */

export type IngestionRawMessage = {
  /** Stable id within the source (Telegram message id, etc.) */
  externalId: number;
  /** Username/slug of the source (Telegram channel username) */
  source: string;
  /** Original message text */
  text: string;
  /** Public media URLs */
  mediaUrls: string[];
  /** Time the message was posted at the source */
  postedAt: Date;
  /** Whatever raw structure the source returned (for forensics) */
  raw: Record<string, unknown>;
};

export interface IngestionSource {
  /** Stable name of this source, e.g. "mock" or "telegram". */
  readonly name: string;

  /**
   * Fetch new messages since the given watermark for a specific source
   * (channel username). Implementations should return them in chronological
   * order, oldest first.
   */
  fetchMessages(input: {
    channelUsername: string;
    since?: Date;
    limit?: number;
  }): Promise<IngestionRawMessage[]>;
}

export class NotImplementedError extends Error {
  constructor(what: string) {
    super(`${what} is not implemented yet`);
    this.name = "NotImplementedError";
  }
}
