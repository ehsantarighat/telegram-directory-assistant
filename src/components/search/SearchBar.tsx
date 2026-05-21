"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SearchIcon, XIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 350;

type Props = {
  placeholder?: string;
  className?: string;
};

/**
 * Debounced search input. URL `q` param is the source of truth.
 *
 * The inner component is keyed on the current URL value so that any
 * external URL change (e.g., chip removal) cleanly remounts with fresh
 * state — no setState-in-effect synchronization needed.
 */
export function SearchBar({
  placeholder = "Search by district, channel, keyword...",
  className,
}: Props) {
  const searchParams = useSearchParams();
  const urlValue = searchParams.get("q") ?? "";
  return (
    <SearchBarInner
      key={urlValue}
      initial={urlValue}
      placeholder={placeholder}
      className={className}
    />
  );
}

function SearchBarInner({
  initial,
  placeholder,
  className,
}: {
  initial: string;
  placeholder: string;
  className?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [value, setValue] = useState(initial);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const push = (next: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next.trim()) params.set("q", next.trim());
    else params.delete("q");
    params.delete("cursor");
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setValue(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => push(next), DEBOUNCE_MS);
  };

  const handleClear = () => {
    setValue("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    push("");
    inputRef.current?.focus();
  };

  return (
    <div className={cn("relative w-full", className)}>
      <SearchIcon
        className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        ref={inputRef}
        type="search"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        aria-label="Search listings"
        className="ps-9 pe-9 h-10 rounded-full"
      />
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute end-1.5 top-1/2 -translate-y-1/2"
        >
          <XIcon className="h-4 w-4" aria-hidden />
        </Button>
      )}
    </div>
  );
}
