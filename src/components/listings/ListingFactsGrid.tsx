import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { propertyTypeLabel } from "@/lib/format/listing";
import type { ListingDetail } from "@/lib/listings/query";

type Props = {
  listing: ListingDetail;
};

/**
 * Renders the extracted structured fields in a clean two-column grid.
 * Hides rows whose value is null/empty so the card stays scannable for
 * sparsely-populated listings.
 */
export function ListingFactsGrid({ listing }: Props) {
  const facts: Array<[string, ReactNode | null]> = [
    ["Property type", listing.propertyType ? propertyTypeLabel[listing.propertyType] : null],
    ["Rooms", listing.rooms != null ? String(listing.rooms) : null],
    [
      "Area",
      listing.areaSqm != null && listing.areaSqm !== ""
        ? `${parseFloat(listing.areaSqm).toFixed(0)} m²`
        : null,
    ],
    [
      "Floor",
      listing.floor != null
        ? listing.totalFloors != null
          ? `${listing.floor} of ${listing.totalFloors}`
          : String(listing.floor)
        : null,
    ],
    ["Furnished", listing.furnished == null ? null : listing.furnished ? "Yes" : "No"],
    [
      "New building",
      listing.newBuilding == null ? null : listing.newBuilding ? "Yes" : "No",
    ],
    ["Renovation", listing.renovationStatus],
    ["Metro nearby", listing.metroNearby == null ? null : listing.metroNearby ? "Yes" : "No"],
    [
      "Posted by",
      listing.ownerOrAgent === "owner"
        ? "Owner"
        : listing.ownerOrAgent === "agent"
          ? "Agent"
          : null,
    ],
    ["Commission", listing.commission],
    ["Parking", listing.parking == null ? null : listing.parking ? "Yes" : "No"],
    ["Balcony", listing.balcony == null ? null : listing.balcony ? "Yes" : "No"],
    ["Elevator", listing.elevator == null ? null : listing.elevator ? "Yes" : "No"],
    ["Pets allowed", listing.petsAllowed == null ? null : listing.petsAllowed ? "Yes" : "No"],
    ["Heating", listing.heatingType],
    ["Building material", listing.buildingMaterial],
  ];

  const visible = facts.filter(([, v]) => v != null && v !== "");
  if (visible.length === 0) return null;

  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Details
      </h3>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {visible.map(([label, value]) => (
          <div
            key={label}
            className="flex items-baseline justify-between gap-3 border-b border-border/70 py-1.5 last:border-b-0 sm:border-b-0 sm:py-1"
          >
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
