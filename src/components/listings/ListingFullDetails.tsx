import { Card } from "@/components/ui/card";
import type { ListingDetail } from "@/lib/listings/query";

/**
 * "Full details" card for the listing-detail aside. Surfaces every
 * extracted attribute that ListingFactsGrid doesn't already cover.
 *
 * Each row reads one optional field off the listing. Rows where the
 * value is null/undefined are dropped — a sparsely-extracted listing
 * with only 2 of these populated shows 2 rows, not 11 empty slots.
 *
 * Boolean fields map to "Yes"/"No" with one exception: petsAllowed
 * reads more naturally as "Allowed"/"Not allowed".
 *
 * Returns null entirely when no rows are visible, so the aside
 * doesn't render an empty card for listings whose Telegram post had
 * no extra attributes.
 */
type Props = {
  listing: ListingDetail;
};

const yesNo = (v: boolean | null | undefined): string | null => {
  if (v === true) return "Yes";
  if (v === false) return "No";
  return null;
};

const petsLabel = (v: boolean | null | undefined): string | null => {
  if (v === true) return "Allowed";
  if (v === false) return "Not allowed";
  return null;
};

export function ListingFullDetails({ listing }: Props) {
  const rows: Array<{ label: string; value: string }> = [];

  const newBuilding = yesNo(listing.newBuilding);
  if (newBuilding) rows.push({ label: "New build", value: newBuilding });

  if (listing.renovationStatus)
    rows.push({ label: "Renovation", value: listing.renovationStatus });

  const furnished = yesNo(listing.furnished);
  if (furnished) rows.push({ label: "Furnished", value: furnished });

  const elevator = yesNo(listing.elevator);
  if (elevator) rows.push({ label: "Elevator", value: elevator });

  const balcony = yesNo(listing.balcony);
  if (balcony) rows.push({ label: "Balcony", value: balcony });

  const parking = yesNo(listing.parking);
  if (parking) rows.push({ label: "Parking", value: parking });

  const pets = petsLabel(listing.petsAllowed);
  if (pets) rows.push({ label: "Pets", value: pets });

  const metroNearby = yesNo(listing.metroNearby);
  if (metroNearby) rows.push({ label: "Metro nearby", value: metroNearby });

  if (listing.heatingType)
    rows.push({ label: "Heating", value: listing.heatingType });

  if (listing.buildingMaterial)
    rows.push({ label: "Material", value: listing.buildingMaterial });

  if (listing.ownerOrAgent)
    rows.push({ label: "Listed by", value: listing.ownerOrAgent });

  if (listing.commission)
    rows.push({ label: "Commission", value: listing.commission });

  if (rows.length === 0) return null;

  return (
    <Card className="p-4 md:p-5">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Full details
      </h3>
      <dl className="flex flex-col gap-2 text-sm">
        {rows.map((r) => (
          <div
            key={r.label}
            className="flex items-baseline justify-between gap-3"
          >
            <dt className="shrink-0 text-muted-foreground">{r.label}</dt>
            <dd className="min-w-0 break-words text-right font-medium text-foreground">
              {r.value}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
