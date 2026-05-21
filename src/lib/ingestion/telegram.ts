import { NotImplementedError, type IngestionSource } from "./types";

/**
 * Telegram source — to be implemented in Phase 4.
 *
 * Implementation plan:
 *   1) Use MTProto via `gramjs` (or `tdlib`) running in a long-lived worker
 *      process. Auth via a user account (one-time login with session string
 *      stored in TELEGRAM_SESSION env var) or a Bot API (limited reach).
 *   2) For each channel in `channels` table where is_active = true:
 *        - Resolve username -> peer
 *        - getHistory since channels.last_ingested_at (or oldest message id
 *          stored on raw_messages)
 *        - Convert each message into IngestionRawMessage
 *   3) Pass batch to pipeline.ingestBatch(). Persist `lastIngestedAt`.
 *
 * Keep this file as the only piece that changes when we wire the real
 * Telegram client. The pipeline above is source-agnostic.
 */
export class TelegramIngestionSource implements IngestionSource {
  readonly name = "telegram";

  async fetchMessages(): Promise<never> {
    throw new NotImplementedError("TelegramIngestionSource.fetchMessages");
  }
}
