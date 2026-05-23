"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDownIcon } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "most_viewed", label: "Most viewed" },
  { value: "most_saved", label: "Most saved" },
] as const;

export function SortSelect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current =
    (searchParams.get("sort") as (typeof OPTIONS)[number]["value"]) ??
    "newest";

  const handleChange = (value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "newest") params.delete("sort");
    else params.set("sort", value);
    params.delete("cursor");
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  return (
    <Select value={current} onValueChange={handleChange}>
      <SelectTrigger
        size="sm"
        className="gap-1.5"
        aria-label="Sort listings"
      >
        <ArrowUpDownIcon className="h-3.5 w-3.5" aria-hidden />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
