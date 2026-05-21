"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { LanguagesIcon } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Lang = "original" | "en" | "ru" | "fa";

const LABELS: Record<Lang, string> = {
  original: "Original",
  en: "English",
  ru: "Russian",
  fa: "Persian (فارسی)",
};

type Props = {
  defaultLanguage?: Lang;
  className?: string;
};

/**
 * URL-driven language picker for the listing detail page.
 *
 * Writes `?lang=en|ru|fa` to the URL. The detail server component reads
 * it, calls translateListing(), and renders the translated body. No
 * client-side fetch needed — the page server-renders the right content
 * on each navigation.
 *
 * `original` clears the param so the page renders the source-language
 * text.
 */
export function TranslationToggle({
  defaultLanguage,
  className,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const current = ((): Lang => {
    const v = searchParams.get("lang");
    if (v === "en" || v === "ru" || v === "fa") return v;
    return defaultLanguage ?? "original";
  })();

  const handleChange = (value: string | null) => {
    const next = (value ?? "original") as Lang;
    const params = new URLSearchParams(searchParams.toString());
    if (next === "original") params.delete("lang");
    else params.set("lang", next);
    startTransition(() => {
      router.replace(`?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <LanguagesIcon
        className={cn(
          "h-4 w-4 text-muted-foreground",
          pending && "animate-pulse",
        )}
        aria-hidden
      />
      <Select value={current} onValueChange={handleChange}>
        <SelectTrigger
          size="sm"
          className="w-[170px]"
          aria-label="Translate this listing"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(LABELS) as Lang[]).map((key) => (
            <SelectItem key={key} value={key}>
              {LABELS[key]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
