import { Badge } from "@/components/ui/badge";
import { listingTypeLabel } from "@/lib/format/listing";
import { cn } from "@/lib/utils";

const COLORS: Record<"rent" | "sale" | "daily_rent", string> = {
  rent: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
  sale: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  daily_rent:
    "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
};

export function ListingTypeBadge({
  type,
  className,
}: {
  type: "rent" | "sale" | "daily_rent";
  className?: string;
}) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "rounded-full border-transparent text-[11px] font-semibold uppercase tracking-wide",
        COLORS[type],
        className,
      )}
    >
      {listingTypeLabel[type]}
    </Badge>
  );
}
