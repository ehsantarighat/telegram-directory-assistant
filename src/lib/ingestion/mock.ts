import type { IngestionRawMessage, IngestionSource } from "./types";

/**
 * Mock Telegram source for Phase 10.
 *
 * Cycles through a pool of plausible Russian real-estate posts, picking
 * 1–3 per call. Every invocation produces fresh, unique messages
 * (externalId derived from Date.now()+index, postedAt slightly in the
 * past) so admins can press "Run sync" repeatedly on any channel and
 * watch new rows roll in.
 *
 * No persistent state — fine for serverless (each server-action call
 * spins up its own MockIngestionSource).
 *
 * Replace this implementation with the real Telethon-backed source in
 * the post-MVP "Real Telegram Worker" task. The IngestionSource
 * interface is the swap point; the pipeline and admin action stay the
 * same.
 */

const TEMPLATES: ReadonlyArray<{
  text: string;
  mediaUrls: string[];
}> = [
  {
    text:
      "Сдается 1-комнатная квартира, Юнусабад.\n" +
      "32м², 3/9 этаж. Современный ремонт, мебель.\n" +
      "4 200 000 сум/месяц.\n" +
      "+998901112233",
    mediaUrls: [
      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=900",
    ],
  },
  {
    text:
      "Продается 2-комнатная, Яккасарай.\n" +
      "55м², 5/9 этаж. Кирпичный дом, индивидуальное отопление.\n" +
      "$78 000.\n" +
      "+998978889911",
    mediaUrls: [],
  },
  {
    text:
      "Посуточно: студия в новостройке, Сергели.\n" +
      "28м², AC, Wi-Fi, рядом метро.\n" +
      "280 000 сум/сутки.\n" +
      "+998935559988",
    mediaUrls: [
      "https://images.unsplash.com/photo-1554995207-c18c203602cb?w=900",
    ],
  },
  {
    text:
      "Сдается 3-комнатная, Мирабад.\n" +
      "85м², 7/12 этаж. Tashkent City view.\n" +
      "$850/мес. +998901003344",
    mediaUrls: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=900",
    ],
  },
  {
    text:
      "Продается дом, Шайхонтохур. 200м², 6 соток земли, гараж.\n" +
      "$220 000.\n" +
      "+998935551122",
    mediaUrls: [],
  },
  {
    text:
      "Сдается 2-комнатная, Чиланзар. 60м², 4/5 этаж.\n" +
      "Семейный двор, тихий район. 5 500 000 сум/месяц.\n" +
      "+998901008877",
    mediaUrls: [
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=900",
    ],
  },
  {
    text:
      "Срочно продается 1-комнатная, Олмазор.\n" +
      "30м², 2/5 этаж. Документы готовы, торг.\n" +
      "410 000 000 сум.\n" +
      "+998935557799",
    mediaUrls: [],
  },
];

export class MockIngestionSource implements IngestionSource {
  readonly name = "mock";

  async fetchMessages(input: {
    channelUsername: string;
    since?: Date;
    limit?: number;
  }): Promise<IngestionRawMessage[]> {
    // Pick 1-3 templates deterministically by current minute, so reruns
    // within the same minute don't go wild — but the next minute they
    // produce different posts.
    const minute = Math.floor(Date.now() / 60_000);
    const count = 1 + (minute % 3); // 1-3 messages
    const startIdx = minute % TEMPLATES.length;

    const baseTime = Date.now();
    const channelSalt = this.stableId(input.channelUsername);

    const messages: IngestionRawMessage[] = Array.from({ length: count }).map(
      (_, i) => {
        const tpl = TEMPLATES[(startIdx + i) % TEMPLATES.length];
        // Unique externalId per (channel × minute × index)
        const externalId =
          channelSalt * 100_000_000 + minute * 10 + i;
        // postedAt slightly in the past so it beats lastSyncedAt
        const postedAt = new Date(baseTime - (i + 1) * 1000);
        return {
          externalId,
          source: input.channelUsername,
          text: tpl.text,
          mediaUrls: [...tpl.mediaUrls],
          postedAt,
          raw: { mockMinute: minute, mockIndex: i },
        };
      },
    );

    const filtered = input.since
      ? messages.filter((m) => m.postedAt > input.since!)
      : messages;
    return input.limit ? filtered.slice(0, input.limit) : filtered;
  }

  /** Deterministic small positive integer from a string. */
  private stableId(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h % 10_000) + 1;
  }
}
