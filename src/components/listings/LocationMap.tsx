import { MapPinIcon } from "lucide-react";

import { Card } from "@/components/ui/card";

type Props = {
  city: string | null;
  district: string | null;
  neighborhood: string | null;
  country: string | null;
};

/**
 * Approximate-area map for the listing's location, embedded as a
 * Yandex Maps widget iframe. No API key required.
 *
 * Why Yandex (not Google) for this audience:
 *   - Tashkent locals navigate with Yandex. Its POI database covers
 *     the ЖК (residential complex) names and metro landmarks that
 *     appear in Telegram post text ("ЖК Luminar House", "Metro
 *     Айбек"). Google maps for Tashkent are noticeably sparser.
 *   - Yandex's free iframe widget needs no API key and no quota.
 *
 * Why "approximate" not a pin:
 *   - We extract district and (sometimes) neighborhood/ЖК name from
 *     the post text. We never get GPS coordinates or full street
 *     addresses. The map's job is to give visitors a sense of WHERE
 *     in Tashkent the listing is, not to navigate them to a door.
 *   - Rendered as a search-results view, not a pinned marker, which
 *     also avoids implying false precision.
 */
export function LocationMap({ city, district, neighborhood, country }: Props) {
  // Build the most specific query we can. Most → least specific:
  //   1. neighborhood + district + city  (best — narrow area)
  //   2. district + city                  (district outline)
  //   3. city + country                   (last resort, broad)
  const parts = [neighborhood, district, city, country].filter(
    (p): p is string => Boolean(p?.trim()),
  );
  if (parts.length === 0 || !city) return null;

  const query = parts.join(", ");
  // z=14 is roughly district-scale zoom. lang=en_US for the widget
  // chrome; POI labels still render in the local script.
  const src = `https://yandex.com/map-widget/v1/?text=${encodeURIComponent(
    query,
  )}&z=14&lang=en_US`;

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <MapPinIcon className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h3 className="text-sm font-semibold truncate" dir="ltr">
            {query}
          </h3>
        </div>
        <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
          Approximate area
        </span>
      </div>
      <div className="aspect-[16/10] w-full bg-muted">
        <iframe
          src={src}
          className="h-full w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={`Map view of ${query}`}
          allow="geolocation"
        />
      </div>
      <p className="px-4 py-2 text-[11px] text-muted-foreground">
        Map shows the general district / neighborhood — not the exact
        listing address. Always verify directly with the source before
        making travel or payment decisions.
      </p>
    </Card>
  );
}
