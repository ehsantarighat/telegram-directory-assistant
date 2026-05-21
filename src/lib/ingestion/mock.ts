import type { IngestionRawMessage, IngestionSource } from "./types";

/**
 * Test/seed source. Returns a small pool of canned messages keyed by channel
 * username. Used by `pnpm ingest:mock` and by future tests so the pipeline
 * can be exercised end-to-end with no network.
 */
export class MockIngestionSource implements IngestionSource {
  readonly name = "mock";

  private readonly canned: Record<string, IngestionRawMessage[]>;

  constructor() {
    const baseTime = Date.now();
    this.canned = {
      uz_realty_tashkent: [
        {
          externalId: 9_000_001,
          source: "uz_realty_tashkent",
          text:
            "Сдается 2-комнатная квартира в Мирзо Улугбекском районе.\n" +
            "Площадь 65м², 4/9 этаж, мебель и техника.\n" +
            "Цена: 6 500 000 сум/мес.\n" +
            "Тел: +998901234567",
          mediaUrls: [
            "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=900",
          ],
          postedAt: new Date(baseTime - 1000 * 60 * 60 * 2),
          raw: { mockSeq: 1 },
        },
        {
          externalId: 9_000_002,
          source: "uz_realty_tashkent",
          text:
            "Продается 3-комнатная квартира, Чиланзар.\n" +
            "Площадь 78м², 6/9 этаж.\n" +
            "Цена: 980 000 000 сум.\n" +
            "Тел: +998935557766",
          mediaUrls: [],
          postedAt: new Date(baseTime - 1000 * 60 * 60 * 5),
          raw: { mockSeq: 2 },
        },
      ],
      uz_daily_rent: [
        {
          externalId: 9_100_001,
          source: "uz_daily_rent",
          text:
            "Посуточно: уютная 1-комнатная у площади Амира Темура.\n" +
            "AC, Wi-Fi, 36м².\n" +
            "350 000 сум/сутки.\n" +
            "+998935550022",
          mediaUrls: [],
          postedAt: new Date(baseTime - 1000 * 60 * 30),
          raw: { mockSeq: 3 },
        },
      ],
    };
  }

  async fetchMessages(input: {
    channelUsername: string;
    since?: Date;
    limit?: number;
  }): Promise<IngestionRawMessage[]> {
    const all = this.canned[input.channelUsername] ?? [];
    const after = input.since
      ? all.filter((m) => m.postedAt > input.since!)
      : all;
    return input.limit ? after.slice(0, input.limit) : after;
  }
}
