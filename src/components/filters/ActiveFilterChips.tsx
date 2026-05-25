"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { XIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listingTypeLabel, propertyTypeLabel } from "@/lib/format/listing";
import { cn } from "@/lib/utils";

import { parseFilters, type FilterState } from "./filter-state";

/**
 * Shows the currently-applied filters as removable chips above the feed.
 * Click X on a chip to drop that filter. Click "Clear" to drop everything
 * except `q` and `sort`.
 */
export function ActiveFilterChips({ className }: { className?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filters = parseFilters(searchParams);

  const chips = collectChips(filters);
  if (chips.length === 0) return null;

  /**
   * Drop one filter value. For multi-value keys (city, district) we
   * remove just `chipValue` from the comma-list and keep the rest;
   * dropping the last value clears the key entirely. For everything
   * else we delete the key outright.
   */
  const removeFilter = (key: keyof FilterState, chipValue?: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if ((key === "city" || key === "district") && chipValue) {
      const current = next.get(key);
      if (current) {
        const remaining = current
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0 && s !== chipValue);
        if (remaining.length > 0) {
          next.set(key, remaining.join(","));
        } else {
          next.delete(key);
        }
      } else {
        next.delete(key);
      }
    } else {
      next.delete(key as string);
    }
    next.delete("cursor");
    router.replace(`?${next.toString()}`, { scroll: false });
  };

  const clearAll = () => {
    const next = new URLSearchParams();
    const q = searchParams.get("q");
    const sort = searchParams.get("sort");
    if (q) next.set("q", q);
    if (sort) next.set("sort", sort);
    router.replace(`?${next.toString()}`, { scroll: false });
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {chips.map((chip) => (
        <Badge
          key={`${chip.key}:${chip.value}`}
          variant="secondary"
          className="gap-1 rounded-full pe-1 ps-2.5 text-xs"
        >
          <span className="font-normal text-muted-foreground">{chip.label}:</span>{" "}
          <span className="font-medium">{chip.value}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => removeFilter(chip.key, chip.value)}
            aria-label={`Remove filter ${chip.label} ${chip.value}`}
            className="size-5 rounded-full hover:bg-background"
          >
            <XIcon className="h-3 w-3" aria-hidden />
          </Button>
        </Badge>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={clearAll}
        className="text-xs text-muted-foreground"
      >
        Clear all
      </Button>
    </div>
  );
}

type Chip = {
  key: keyof FilterState;
  label: string;
  value: string;
};

function collectChips(state: FilterState): Chip[] {
  const out: Chip[] = [];
  if (state.type)
    out.push({ key: "type", label: "Type", value: listingTypeLabel[state.type] });
  if (state.propertyType)
    out.push({
      key: "propertyType",
      label: "Property",
      value: propertyTypeLabel[state.propertyType],
    });
  // Multi-value filters render one chip per selected value, each
  // individually removable via the chip's × button.
  if (state.city) {
    for (const v of state.city) {
      out.push({ key: "city", label: "City", value: v });
    }
  }
  if (state.district) {
    for (const v of state.district) {
      out.push({ key: "district", label: "District", value: v });
    }
  }
  if (state.channelUsername)
    out.push({
      key: "channelUsername",
      label: "Channel",
      value: `@${state.channelUsername}`,
    });
  if (state.minPrice)
    out.push({ key: "minPrice", label: "Min price", value: state.minPrice });
  if (state.maxPrice)
    out.push({ key: "maxPrice", label: "Max price", value: state.maxPrice });
  if (state.currency)
    out.push({ key: "currency", label: "Currency", value: state.currency });
  if (state.rooms)
    out.push({ key: "rooms", label: "Rooms", value: state.rooms });
  if (state.minAreaSqm)
    out.push({ key: "minAreaSqm", label: "Min area", value: `${state.minAreaSqm} m²` });
  if (state.maxAreaSqm)
    out.push({ key: "maxAreaSqm", label: "Max area", value: `${state.maxAreaSqm} m²` });
  if (state.floor)
    out.push({ key: "floor", label: "Floor", value: state.floor });
  if (state.hasPhotos !== undefined)
    out.push({
      key: "hasPhotos",
      label: "Photos",
      value: state.hasPhotos ? "Yes" : "No",
    });
  if (state.furnished !== undefined)
    out.push({
      key: "furnished",
      label: "Furnished",
      value: state.furnished ? "Yes" : "No",
    });
  if (state.newBuilding !== undefined)
    out.push({
      key: "newBuilding",
      label: "New build",
      value: state.newBuilding ? "Yes" : "No",
    });
  if (state.metroNearby !== undefined)
    out.push({
      key: "metroNearby",
      label: "Metro",
      value: state.metroNearby ? "Yes" : "No",
    });
  if (state.parking !== undefined)
    out.push({
      key: "parking",
      label: "Parking",
      value: state.parking ? "Yes" : "No",
    });
  if (state.balcony !== undefined)
    out.push({
      key: "balcony",
      label: "Balcony",
      value: state.balcony ? "Yes" : "No",
    });
  if (state.elevator !== undefined)
    out.push({
      key: "elevator",
      label: "Elevator",
      value: state.elevator ? "Yes" : "No",
    });
  if (state.petsAllowed !== undefined)
    out.push({
      key: "petsAllowed",
      label: "Pets",
      value: state.petsAllowed ? "Yes" : "No",
    });
  if (state.renovationStatus)
    out.push({
      key: "renovationStatus",
      label: "Renovation",
      value: state.renovationStatus,
    });
  if (state.heatingType)
    out.push({ key: "heatingType", label: "Heating", value: state.heatingType });
  if (state.buildingMaterial)
    out.push({
      key: "buildingMaterial",
      label: "Material",
      value: state.buildingMaterial,
    });
  if (state.ownerOrAgent)
    out.push({
      key: "ownerOrAgent",
      label: "Posted by",
      value: state.ownerOrAgent === "owner" ? "Owner" : "Agent",
    });
  return out;
}
