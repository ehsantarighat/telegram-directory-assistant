import Link from "next/link";
import { LanguagesIcon, XIcon } from "lucide-react";

import { LANGUAGE_LABELS, type TargetLanguage } from "@/lib/translation/types";
import { cn } from "@/lib/utils";

type Props = {
  language: TargetLanguage;
  provider: string;
  /** Path back to the original-language view (e.g. /listings/abc) */
  originalHref: string;
  className?: string;
};

/**
 * Inline banner shown above translated content so the user understands
 * they're reading a machine translation and can revert.
 */
export function TranslationBadge({
  language,
  provider,
  originalHref,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-xs",
        className,
      )}
      role="status"
    >
      <LanguagesIcon
        className="h-3.5 w-3.5 text-muted-foreground"
        aria-hidden
      />
      <span className="text-muted-foreground">
        Showing {LANGUAGE_LABELS[language]} translation
      </span>
      <span className="rounded-full bg-background px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {provider}
      </span>
      <Link
        href={originalHref}
        className="ms-auto inline-flex items-center gap-1 font-medium text-primary hover:underline"
      >
        <XIcon className="h-3 w-3" aria-hidden />
        Show original
      </Link>
    </div>
  );
}
