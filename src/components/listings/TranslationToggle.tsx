"use client";

import { useState } from "react";
import { LanguagesIcon } from "lucide-react";
import { toast } from "sonner";

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
  listingId: string;
  defaultLanguage?: Lang;
  className?: string;
};

/**
 * Phase 6 placeholder. Shows a language picker but doesn't yet trigger
 * the cached / on-demand translation flow — that lands in Phase 6 with
 * listing_translations cache lookups and the rtl renderer.
 */
export function TranslationToggle({
  listingId,
  defaultLanguage = "original",
  className,
}: Props) {
  const [lang, setLang] = useState<Lang>(defaultLanguage);

  const handleChange = (value: string | null) => {
    const next = (value ?? "original") as Lang;
    setLang(next);
    if (next !== "original") {
      toast("Translation cache coming in Phase 6", {
        description: `Will show this listing in ${LABELS[next]}.`,
      });
    }
    void listingId;
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <LanguagesIcon
        className="h-4 w-4 text-muted-foreground"
        aria-hidden
      />
      <Select value={lang} onValueChange={handleChange}>
        <SelectTrigger size="sm" className="w-[170px]">
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
