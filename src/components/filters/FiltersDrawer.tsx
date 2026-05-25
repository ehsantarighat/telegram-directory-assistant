"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDownIcon, FilterIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import {
  countActiveFilters,
  parseFilters,
  serializeFilters,
  type FilterState,
} from "./filter-state";

type Facets = {
  cities: string[];
  districts: string[];
  channels: Array<{ username: string; title: string }>;
  currencies: string[];
};

type Props = {
  facets: Facets;
  className?: string;
};

const TYPE_OPTIONS = [
  { value: "rent", label: "Rent" },
  { value: "sale", label: "Sale" },
  { value: "daily_rent", label: "Daily" },
] as const;

const PROPERTY_TYPE_OPTIONS = [
  { value: "apartment", label: "Apartment" },
  { value: "house", label: "House" },
  { value: "studio", label: "Studio" },
  { value: "room", label: "Room" },
  { value: "commercial", label: "Commercial" },
  { value: "land", label: "Land" },
] as const;

const OWNER_OPTIONS = [
  { value: "owner", label: "From owner" },
  { value: "agent", label: "Via agent" },
] as const;

export function FiltersDrawer({ facets, className }: Props) {
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const activeCount = countActiveFilters(parseFilters(searchParams));

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className={cn("gap-1.5", className)}
            aria-label="Open filters"
          />
        }
      >
        <FilterIcon className="h-3.5 w-3.5" aria-hidden />
        Filters
        {activeCount > 0 && (
          <Badge
            variant="secondary"
            className="ms-1 h-5 rounded-full px-1.5 text-[10px]"
          >
            {activeCount}
          </Badge>
        )}
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex w-full max-w-md flex-col gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription>
            Refine real estate listings. Apply to update the feed.
          </SheetDescription>
        </SheetHeader>

        {open && <FiltersForm facets={facets} onApplied={() => setOpen(false)} />}
      </SheetContent>
    </Sheet>
  );
}

function FiltersForm({
  facets,
  onApplied,
}: {
  facets: Facets;
  onApplied: () => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [draft, setDraft] = useState<FilterState>(() =>
    parseFilters(searchParams),
  );
  const [showAdvanced, setShowAdvanced] = useState(false);

  const apply = () => {
    const existing = new URLSearchParams(searchParams.toString());
    const draftParams = serializeFilters(draft);
    const next = new URLSearchParams();
    for (const [k, v] of draftParams) next.set(k, v);
    const q = existing.get("q");
    if (q) next.set("q", q);
    const sort = existing.get("sort");
    if (sort) next.set("sort", sort);
    router.replace(`?${next.toString()}`, { scroll: false });
    onApplied();
  };

  const clearAll = () => setDraft({});

  return (
    <>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="space-y-5">
            {/* Type */}
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Listing type
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {TYPE_OPTIONS.map((o) => (
                  <Toggle
                    key={o.value}
                    label={o.label}
                    active={draft.type === o.value}
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        type: d.type === o.value ? undefined : (o.value as FilterState["type"]),
                      }))
                    }
                  />
                ))}
              </div>
            </section>

            {/* Property type */}
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Property type
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {PROPERTY_TYPE_OPTIONS.map((o) => (
                  <Toggle
                    key={o.value}
                    label={o.label}
                    active={draft.propertyType === o.value}
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        propertyType:
                          d.propertyType === o.value
                            ? undefined
                            : (o.value as FilterState["propertyType"]),
                      }))
                    }
                  />
                ))}
              </div>
            </section>

            {/* Location — multi-select. Empty array == "no filter". */}
            <section className="grid gap-4">
              <MultiToggleField
                label="City"
                values={draft.city ?? []}
                options={facets.cities}
                onChange={(next) =>
                  setDraft((d) => ({
                    ...d,
                    city: next.length > 0 ? next : undefined,
                  }))
                }
              />
              <MultiToggleField
                label="District"
                values={draft.district ?? []}
                options={facets.districts}
                onChange={(next) =>
                  setDraft((d) => ({
                    ...d,
                    district: next.length > 0 ? next : undefined,
                  }))
                }
              />
            </section>

            {/* Price */}
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Price
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="Min"
                  value={draft.minPrice ?? ""}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, minPrice: e.target.value || undefined }))
                  }
                  aria-label="Min price"
                />
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="Max"
                  value={draft.maxPrice ?? ""}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, maxPrice: e.target.value || undefined }))
                  }
                  aria-label="Max price"
                />
                <SelectClearable
                  value={draft.currency}
                  onChange={(v) => setDraft((d) => ({ ...d, currency: v }))}
                  placeholder="Any"
                  options={facets.currencies.map((c) => ({ value: c, label: c }))}
                />
              </div>
            </section>

            {/* Size */}
            <section className="grid grid-cols-2 gap-3">
              <Field label="Rooms">
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="Any"
                  value={draft.rooms ?? ""}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, rooms: e.target.value || undefined }))
                  }
                  aria-label="Rooms"
                />
              </Field>
              <Field label="Floor">
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="Any"
                  value={draft.floor ?? ""}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, floor: e.target.value || undefined }))
                  }
                  aria-label="Floor"
                />
              </Field>
              <Field label="Min area (m²)">
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="Any"
                  value={draft.minAreaSqm ?? ""}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, minAreaSqm: e.target.value || undefined }))
                  }
                  aria-label="Min area"
                />
              </Field>
              <Field label="Max area (m²)">
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="Any"
                  value={draft.maxAreaSqm ?? ""}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, maxAreaSqm: e.target.value || undefined }))
                  }
                  aria-label="Max area"
                />
              </Field>
            </section>

            {/* Quick toggles */}
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Quick filters
              </h3>
              <div className="grid grid-cols-2 gap-1.5">
                <BooleanToggle
                  label="Has photos"
                  value={draft.hasPhotos}
                  onChange={(v) => setDraft((d) => ({ ...d, hasPhotos: v }))}
                />
                <BooleanToggle
                  label="Furnished"
                  value={draft.furnished}
                  onChange={(v) => setDraft((d) => ({ ...d, furnished: v }))}
                />
              </div>
            </section>

            {/* Channel */}
            <section>
              <Field label="Source channel">
                <SelectClearable
                  value={draft.channelUsername}
                  onChange={(v) => setDraft((d) => ({ ...d, channelUsername: v }))}
                  placeholder="Any channel"
                  options={facets.channels.map((c) => ({
                    value: c.username,
                    label: `${c.title} (@${c.username})`,
                  }))}
                />
              </Field>
            </section>

            {/* Advanced */}
            <section>
              <button
                type="button"
                onClick={() => setShowAdvanced((s) => !s)}
                className="flex w-full items-center justify-between rounded-md py-1 text-sm font-semibold"
                aria-expanded={showAdvanced}
              >
                Advanced filters
                <ChevronDownIcon
                  className={cn(
                    "h-4 w-4 transition-transform",
                    showAdvanced && "rotate-180",
                  )}
                  aria-hidden
                />
              </button>
              {showAdvanced && (
                <div className="mt-3 space-y-4 border-t border-border pt-4">
                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Building &amp; amenities
                    </h4>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        ["newBuilding", "New building"],
                        ["metroNearby", "Metro nearby"],
                        ["parking", "Parking"],
                        ["balcony", "Balcony"],
                        ["elevator", "Elevator"],
                        ["petsAllowed", "Pets allowed"],
                      ].map(([key, label]) => (
                        <BooleanToggle
                          key={key as string}
                          label={label as string}
                          value={draft[key as keyof FilterState] as boolean | undefined}
                          onChange={(v) =>
                            setDraft((d) => ({ ...d, [key as string]: v }))
                          }
                        />
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Renovation">
                      <Input
                        placeholder="e.g. euro, designer"
                        value={draft.renovationStatus ?? ""}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            renovationStatus: e.target.value || undefined,
                          }))
                        }
                      />
                    </Field>
                    <Field label="Heating">
                      <Input
                        placeholder="central, individual"
                        value={draft.heatingType ?? ""}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            heatingType: e.target.value || undefined,
                          }))
                        }
                      />
                    </Field>
                    <Field label="Building material">
                      <Input
                        placeholder="brick, panel, monolith"
                        value={draft.buildingMaterial ?? ""}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            buildingMaterial: e.target.value || undefined,
                          }))
                        }
                      />
                    </Field>
                    <Field label="Owner / Agent">
                      <SelectClearable
                        value={draft.ownerOrAgent}
                        onChange={(v) =>
                          setDraft((d) => ({
                            ...d,
                            ownerOrAgent: v as FilterState["ownerOrAgent"],
                          }))
                        }
                        placeholder="Any"
                        options={OWNER_OPTIONS.map((o) => ({
                          value: o.value,
                          label: o.label,
                        }))}
                      />
                    </Field>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border bg-background px-5 py-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="text-muted-foreground"
          >
            Clear all
          </Button>
          <div className="flex items-center gap-2">
            <SheetClose
              render={<Button variant="outline" size="sm" />}
            >
              Cancel
            </SheetClose>
            <Button onClick={apply} size="sm">
              Apply filters
            </Button>
          </div>
        </div>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-xs font-medium">
      <span className="text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      {children}
    </label>
  );
}

function Toggle({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant={active ? "default" : "outline"}
      size="sm"
      onClick={onClick}
      className="rounded-full"
      aria-pressed={active}
    >
      {label}
    </Button>
  );
}

function BooleanToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | undefined;
  onChange: (v: boolean | undefined) => void;
}) {
  const next = () => {
    if (value === undefined) onChange(true);
    else if (value === true) onChange(false);
    else onChange(undefined);
  };
  const display = value === true ? "Yes" : value === false ? "No" : "Any";
  return (
    <Button
      type="button"
      variant={value === undefined ? "outline" : "secondary"}
      size="sm"
      onClick={next}
      className="justify-between gap-2"
    >
      <span>{label}</span>
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {display}
      </span>
    </Button>
  );
}

/**
 * Multi-select chip list. Each option is a Toggle; clicking adds or
 * removes the value from the selected array. Scrollable when long so
 * districts (~40+) don't blow up the drawer height.
 *
 * Shows a per-section "Clear N" link when anything's selected — quick
 * way to drop the whole category without clicking each chip.
 */
function MultiToggleField({
  label,
  values,
  options,
  onChange,
}: {
  label: string;
  values: string[];
  options: string[];
  onChange: (next: string[]) => void;
}) {
  const selected = new Set(values);
  const toggle = (opt: string) => {
    const next = new Set(selected);
    if (next.has(opt)) next.delete(opt);
    else next.add(opt);
    // Preserve facet order so the URL is stable across re-renders;
    // arrays in random order would churn the URL on every re-select.
    onChange(options.filter((o) => next.has(o)));
  };
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
          {values.length > 0 && (
            <span className="ms-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] normal-case tracking-normal text-foreground">
              {values.length}
            </span>
          )}
        </h3>
        {values.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-[11px] text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>
      {options.length === 0 ? (
        <p className="text-xs text-muted-foreground">No options available.</p>
      ) : (
        <div className="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto rounded-md border border-border/50 p-2">
          {options.map((opt) => (
            <Toggle
              key={opt}
              label={opt}
              active={selected.has(opt)}
              onClick={() => toggle(opt)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SelectClearable({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string | undefined;
  onChange: (v: string | undefined) => void;
  placeholder: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <Select
      value={value ?? "__any__"}
      onValueChange={(v) =>
        onChange(v == null || v === "__any__" ? undefined : v)
      }
    >
      <SelectTrigger size="sm" className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__any__">{placeholder}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
