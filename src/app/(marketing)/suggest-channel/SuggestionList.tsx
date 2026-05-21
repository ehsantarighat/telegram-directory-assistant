import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/states/EmptyState";
import { formatRelative } from "@/lib/format/date";
import type { UserSuggestion } from "@/lib/channel-suggestions/queries";
import { LightbulbIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  items: UserSuggestion[];
};

const STATUS_STYLES: Record<UserSuggestion["status"], string> = {
  pending:
    "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  approved:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  rejected:
    "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
  duplicate:
    "bg-zinc-100 text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200",
};

const STATUS_LABEL: Record<UserSuggestion["status"], string> = {
  pending: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
  duplicate: "Duplicate",
};

export function SuggestionList({ items }: Props) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={LightbulbIcon}
        title="No suggestions yet"
        description="Channels you suggest will appear here with their review status."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((s) => (
        <Card key={s.id} className="p-4">
          <li className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-sm font-semibold">
                @{s.channelUsername ?? "(unknown)"}
              </span>
              <Badge
                variant="secondary"
                className={cn(
                  "rounded-full",
                  STATUS_STYLES[s.status],
                )}
              >
                {STATUS_LABEL[s.status]}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {s.categoryName && <span>· {s.categoryName}</span>}
              {s.suggestedCity && <span>· {s.suggestedCity}</span>}
              <span>· submitted {formatRelative(s.createdAt)}</span>
            </div>
            {s.note && (
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Your note:</span>{" "}
                {s.note}
              </p>
            )}
            {s.adminNote && (
              <p className="rounded-md bg-muted/50 px-3 py-2 text-xs">
                <span className="font-medium text-foreground">
                  Admin note:
                </span>{" "}
                {s.adminNote}
              </p>
            )}
          </li>
        </Card>
      ))}
    </ul>
  );
}
