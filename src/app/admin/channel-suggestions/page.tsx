import Link from "next/link";
import { ExternalLinkIcon, Lightbulb } from "lucide-react";

import { AdminShell } from "@/components/shell/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/states/EmptyState";
import { formatRelative } from "@/lib/format/date";
import { fetchAdminSuggestions } from "@/lib/admin/suggestion-queries";
import { cn } from "@/lib/utils";

import { SuggestionReviewDialog } from "./SuggestionReviewDialog";

export const metadata = {
  title: "Admin · Channel suggestions",
};

export const dynamic = "force-dynamic";

const STATUS_STYLES = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  approved:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  rejected:
    "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
  duplicate:
    "bg-zinc-100 text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200",
} as const;

const STATUS_LABEL = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  duplicate: "Duplicate",
} as const;

const TABS = ["pending", "approved", "rejected", "duplicate"] as const;

export default async function AdminSuggestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const activeStatus =
    TABS.find((t) => t === params.status) ?? "pending";

  const items = await fetchAdminSuggestions({ status: activeStatus });

  return (
    <AdminShell
      title="Channel suggestions"
      description="User-submitted channels awaiting review."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-1">
          {TABS.map((t) => (
            <Button
              key={t}
              render={
                <Link
                  href={
                    t === "pending"
                      ? "/admin/channel-suggestions"
                      : `/admin/channel-suggestions?status=${t}`
                  }
                />
              }
              size="sm"
              variant={t === activeStatus ? "default" : "ghost"}
              className="capitalize"
            >
              {t}
            </Button>
          ))}
        </div>

        {items.length === 0 ? (
          <EmptyState
            icon={Lightbulb}
            title={`No ${activeStatus} suggestions`}
            description="When users submit channels via /suggest-channel they appear here."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((s) => (
              <Card key={s.id} className="p-4">
                <li className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={s.channelUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-sm font-semibold hover:underline"
                        >
                          @{s.channelUsername ?? "(unknown)"}
                          <ExternalLinkIcon className="h-3 w-3" aria-hidden />
                        </Link>
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
                        <span>
                          From{" "}
                          <span className="font-medium text-foreground">
                            {s.submitterName ?? "user"}
                          </span>
                        </span>
                        {s.categoryName && <span>· {s.categoryName}</span>}
                        {s.suggestedCity && <span>· {s.suggestedCity}</span>}
                        <span>· {formatRelative(s.createdAt)}</span>
                      </div>
                    </div>
                    {s.status === "pending" && (
                      <div className="flex flex-wrap gap-1.5">
                        <SuggestionReviewDialog
                          suggestionId={s.id}
                          decision="approved"
                          channelHandle={`@${s.channelUsername}`}
                        />
                        <SuggestionReviewDialog
                          suggestionId={s.id}
                          decision="rejected"
                          channelHandle={`@${s.channelUsername}`}
                        />
                        <SuggestionReviewDialog
                          suggestionId={s.id}
                          decision="duplicate"
                          channelHandle={`@${s.channelUsername}`}
                        />
                      </div>
                    )}
                  </div>
                  {s.note && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        User note:
                      </span>{" "}
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
        )}
      </div>
    </AdminShell>
  );
}
