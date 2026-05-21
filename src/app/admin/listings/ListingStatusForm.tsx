"use client";

import { useTransition } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setListingStatusAction } from "@/lib/admin/listing-actions";

type Status = "active" | "hidden" | "removed";

const ADMIN_TOGGLE_LABELS: Record<Status, string> = {
  active: "Active",
  hidden: "Hidden",
  removed: "Removed",
};

type Props = {
  listingId: string;
  current: "active" | "hidden" | "removed" | "duplicate" | "incomplete";
};

/**
 * Status switcher for listings. Read-only when the pipeline marks a
 * listing 'duplicate' or 'incomplete' — those are observability states
 * for ingestion, not admin moderation states.
 */
export function ListingStatusForm({ listingId, current }: Props) {
  const [pending, startTransition] = useTransition();
  const isReadOnly = current === "duplicate" || current === "incomplete";

  const handleChange = (value: string | null) => {
    if (!value || value === current) return;
    if (value !== "active" && value !== "hidden" && value !== "removed") return;
    const fd = new FormData();
    fd.set("listingId", listingId);
    fd.set("status", value);
    startTransition(async () => {
      await setListingStatusAction(fd);
    });
  };

  return (
    <Select
      value={isReadOnly ? current : current}
      onValueChange={isReadOnly ? () => undefined : handleChange}
      disabled={pending || isReadOnly}
    >
      <SelectTrigger size="sm" className="w-[110px]" aria-label="Listing status">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(ADMIN_TOGGLE_LABELS) as Status[]).map((s) => (
          <SelectItem key={s} value={s}>
            {ADMIN_TOGGLE_LABELS[s]}
          </SelectItem>
        ))}
        {isReadOnly && (
          <SelectItem value={current} disabled>
            {current === "duplicate" ? "Duplicate" : "Incomplete"}
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}
