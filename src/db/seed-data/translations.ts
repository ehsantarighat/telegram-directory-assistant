/**
 * Sample translations seeded for 3 listings × 3 languages (en / ru / fa).
 *
 * Persian translations carry `direction: 'rtl'` so the Phase 6 translation
 * UI renders them correctly. Phase 12 polish validates RTL rendering with
 * mixed-direction numbers (UZS prices) and t.me URLs.
 *
 * `provider: 'mock'` marks these as machine-translated placeholders. When
 * Phase 6 plumbs in a real provider, freshly-created rows will use
 * provider: 'openai' / 'claude' / etc.
 */

export type SeedTranslation = {
  /** seedKey of the listing this translates */
  listingSeedKey: string;
  language: "en" | "ru" | "fa";
  translatedTitle: string;
  translatedSummary: string;
  translatedText: string;
  direction: "ltr" | "rtl";
  provider: "mock";
};

export const seedTranslations: SeedTranslation[] = [
  // -------- rent-mirabad-2br-modern --------
  {
    listingSeedKey: "rent-mirabad-2br-modern",
    language: "en",
    translatedTitle: "Modern 2-room apartment in Mirabad",
    translatedSummary:
      "Renovated 2-room apartment near Magic City. Furnished, AC, washing machine.",
    translatedText:
      "2-room apartment for rent in Mirabad district.\nArea 65 m², 4th of 9 floors, euro-renovation, furniture and appliances.\nPrice: $750/month.\nPhone: +998 90 123 45 67",
    direction: "ltr",
    provider: "mock",
  },
  {
    listingSeedKey: "rent-mirabad-2br-modern",
    language: "ru",
    translatedTitle: "Современная 2-комнатная в Мирабаде",
    translatedSummary:
      "Отремонтированная 2-комнатная квартира рядом с Magic City. С мебелью, кондиционер, стиральная машина.",
    translatedText:
      "Сдается 2-комнатная квартира в Мирабадском районе.\nПлощадь 65 м², 4/9 этаж, евроремонт, мебель и техника.\nЦена: 750$/месяц.\nТел: +998 90 123 45 67",
    direction: "ltr",
    provider: "mock",
  },
  {
    listingSeedKey: "rent-mirabad-2br-modern",
    language: "fa",
    translatedTitle: "آپارتمان مدرن دو خوابه در میرآباد",
    translatedSummary:
      "آپارتمان دو خوابه بازسازی شده نزدیک مجیک سیتی. مبله، کولر، ماشین لباسشویی.",
    translatedText:
      "آپارتمان دو خوابه برای اجاره در منطقه میرآباد.\nمساحت ۶۵ متر مربع، طبقه ۴ از ۹، بازسازی کامل، مبلمان و لوازم خانگی.\nقیمت: ۷۵۰ دلار در ماه.\nتلفن: +998 90 123 45 67",
    direction: "rtl",
    provider: "mock",
  },

  // -------- sale-yunusabad-3br --------
  {
    listingSeedKey: "sale-yunusabad-3br",
    language: "en",
    translatedTitle: "For sale: 3-room apartment in Yunusabad, brick building",
    translatedSummary:
      "Brick building with separate rooms and individual heating. Ready to move in.",
    translatedText:
      "3-room apartment for sale in Yunusabad district.\nArea 80 m², 4th of 9 floors, brick building, individual heating.\nPrice: $84,000.\nPhone: +998 93 555 00 00",
    direction: "ltr",
    provider: "mock",
  },
  {
    listingSeedKey: "sale-yunusabad-3br",
    language: "ru",
    translatedTitle: "Продается 3-комнатная в Юнусабаде, кирпичный дом",
    translatedSummary:
      "Кирпичный дом, раздельные комнаты, индивидуальное отопление, готова к заселению.",
    translatedText:
      "Продается 3-комнатная квартира в Юнусабадском районе.\nПлощадь 80 м², 4/9 этаж, кирпичный дом, индивидуальное отопление.\nЦена: 84 000 $.\nТел: +998 93 555 00 00",
    direction: "ltr",
    provider: "mock",
  },
  {
    listingSeedKey: "sale-yunusabad-3br",
    language: "fa",
    translatedTitle:
      "فروش آپارتمان سه خوابه در یونوس‌آباد، ساختمان آجری",
    translatedSummary:
      "ساختمان آجری با اتاق‌های جدا و سیستم گرمایش مستقل. آماده سکونت.",
    translatedText:
      "فروش آپارتمان سه خوابه در منطقه یونوس‌آباد.\nمساحت ۸۰ متر مربع، طبقه ۴ از ۹، ساختمان آجری، گرمایش مستقل.\nقیمت: ۸۴٬۰۰۰ دلار.\nتلفن: +998 93 555 00 00",
    direction: "rtl",
    provider: "mock",
  },

  // -------- daily-tashkent-city-luxury --------
  {
    listingSeedKey: "daily-tashkent-city-luxury",
    language: "en",
    translatedTitle:
      "Daily: luxury 2-room in Tashkent City tower",
    translatedSummary:
      "Premium daily rental in Tashkent City tower. Concierge, gym, pool.",
    translatedText:
      "Premium daily rental in Tashkent City tower. Concierge, gym, pool.\nArea 70 m², 18th of 28 floors. $95/night.\nPhone: +998 90 111 22 44",
    direction: "ltr",
    provider: "mock",
  },
  {
    listingSeedKey: "daily-tashkent-city-luxury",
    language: "ru",
    translatedTitle: "Посуточно: люкс 2-комнатная в Tashkent City",
    translatedSummary:
      "Премиум-аренда посуточно в башне Tashkent City. Консьерж, спортзал, бассейн.",
    translatedText:
      "Премиум посуточно в башне Tashkent City. Консьерж, спортзал, бассейн.\nПлощадь 70 м², 18/28. 95 $/ночь.\nТел: +998 90 111 22 44",
    direction: "ltr",
    provider: "mock",
  },
  {
    listingSeedKey: "daily-tashkent-city-luxury",
    language: "fa",
    translatedTitle:
      "اجاره روزانه: آپارتمان لوکس دو خوابه در برج تاشکند سیتی",
    translatedSummary:
      "اجاره روزانه لوکس در برج تاشکند سیتی. کنسیرژ، باشگاه، استخر.",
    translatedText:
      "اجاره روزانه لوکس در برج تاشکند سیتی. کنسیرژ، باشگاه، استخر.\nمساحت ۷۰ متر مربع، طبقه ۱۸ از ۲۸. ۹۵ دلار در شب.\nتلفن: +998 90 111 22 44",
    direction: "rtl",
    provider: "mock",
  },
];
