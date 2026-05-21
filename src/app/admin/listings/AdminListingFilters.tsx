"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { SearchIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUSES = [
  { value: "any", label: "Any status" },
  { value: "active", label: "Active" },
  { value: "hidden", label: "Hidden" },
  { value: "removed", label: "Removed" },
  { value: "duplicate", label: "Duplicate" },
  { value: "incomplete", label: "Incomplete" },
] as const;

const TYPES = [
  { value: "any", label: "Any type" },
  { value: "rent", label: "Rent" },
  { value: "sale", label: "Sale" },
  { value: "daily_rent", label: "Daily" },
] as const;

export function AdminListingFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const push = (next: URLSearchParams) => {
    router.replace(`?${next.toString()}`, { scroll: false });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQ(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const next = new URLSearchParams(searchParams.toString());
      if (v.trim()) next.set("q", v.trim());
      else next.delete("q");
      push(next);
    }, 300);
  };

  const handleSelect = (key: "status" | "type") => (value: string | null) => {
    const next = new URLSearchParams(searchParams.toString());
    if (!value || value === "any") next.delete(key);
    else next.set(key, value);
    push(next);
  };

  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
      <div className="relative md:max-w-sm md:flex-1">
        <SearchIcon
          className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={q}
          onChange={handleSearchChange}
          placeholder="Search title, summary, city, district…"
          className="ps-9"
        />
      </div>
      <Select
        value={searchParams.get("status") ?? "any"}
        onValueChange={handleSelect("status")}
      >
        <SelectTrigger size="sm" className="w-[140px]" aria-label="Filter status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUSES.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={searchParams.get("type") ?? "any"}
        onValueChange={handleSelect("type")}
      >
        <SelectTrigger size="sm" className="w-[120px]" aria-label="Filter type">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TYPES.map((t) => (
            <SelectItem key={t.value} value={t.value}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
