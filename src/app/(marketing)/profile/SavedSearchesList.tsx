"use client";

import Link from "next/link";
import { useTransition } from "react";
import { ArrowRightIcon, BellIcon, BellOffIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/states/EmptyState";
import { deleteSavedSearchAction } from "@/lib/saved-searches/actions";
import { formatRelative } from "@/lib/format/date";
import type { UserSavedSearch } from "@/lib/saved-searches/queries";

type Props = {
  items: UserSavedSearch[];
};

const FILTER_LABELS: Record<string, string> = {
  type: "Type",
  propertyType: "Property",
  city: "City",
  district: "District",
  channelUsername: "Channel",
  minPrice: "Min",
  maxPrice: "Max",
  currency: "Currency",
  rooms: "Rooms",
  minAreaSqm: "Min area",
  maxAreaSqm: "Max area",
  furnished: "Furnished",
  hasPhotos: "Photos",
  q: "Search",
  sort: "Sort",
};

const TYPE_LABEL: Record<string, string> = {
  rent: "Rent",
  sale: "Sale",
  daily_rent: "Daily",
};

function summarizeFilters(filters: Record<string, unknown>): string[] {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(filters)) {
    if (v == null || v === "") continue;
    if (k === "sort" && v === "newest") continue;
    const label = FILTER_LABELS[k] ?? k;
    let display: string;
    if (k === "type" && typeof v === "string") display = TYPE_LABEL[v] ?? v;
    else if (typeof v === "boolean") display = v ? "Yes" : "No";
    else display = String(v);
    parts.push(`${label}: ${display}`);
  }
  return parts;
}

function rebuildHref(filters: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v == null || v === "") continue;
    params.set(k, String(v));
  }
  return `/listings${params.size ? `?${params.toString()}` : ""}`;
}

export function SavedSearchesList({ items }: Props) {
  const [pending, startTransition] = useTransition();

  if (items.length === 0) {
    return (
      <EmptyState
        icon={BellOffIcon}
        title="No saved searches yet"
        description="On the listings page, set a few filters then tap 'Save search'."
      />
    );
  }

  const handleDelete = (searchId: string, name: string) => {
    const fd = new FormData();
    fd.set("searchId", searchId);
    startTransition(async () => {
      await deleteSavedSearchAction(fd);
      toast.success(`Removed "${name}"`);
    });
  };

  return (
    <ul className="flex flex-col gap-2">
      {items.map((s) => {
        const summary = summarizeFilters(s.filtersJson);
        const href = rebuildHref(s.filtersJson);
        return (
          <Card key={s.id} className="p-4">
            <li className="flex flex-col gap-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="font-semibold">{s.name}</span>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <span>Saved {formatRelative(s.createdAt)}</span>
                    {s.alertsEnabled ? (
                      <Badge variant="secondary" className="gap-1 rounded-full">
                        <BellIcon className="h-3 w-3" aria-hidden />
                        Alerts on
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="gap-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
                      >
                        <BellOffIcon className="h-3 w-3" aria-hidden />
                        Alerts: coming soon
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    render={<Link href={href} />}
                    size="sm"
                    variant="outline"
                    className="gap-1"
                  >
                    Re-run
                    <ArrowRightIcon className="h-3 w-3" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => handleDelete(s.id, s.name)}
                    disabled={pending}
                    aria-label={`Delete saved search ${s.name}`}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2Icon className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              </div>
              {summary.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {summary.map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </li>
          </Card>
        );
      })}
    </ul>
  );
}
