import Link from "next/link";
import { Megaphone } from "lucide-react";

import { AdminShell } from "@/components/shell/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/states/EmptyState";
import { formatRelative } from "@/lib/format/date";
import { fetchAdminRemovalRequests } from "@/lib/admin/removal-queries";
import { cn } from "@/lib/utils";

import { RemovalReviewDialog } from "./RemovalReviewDialog";

export const metadata = {
  title: "Admin · Removal requests",
};

export const dynamic = "force-dynamic";

const STATUS_STYLES = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  approved:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  rejected: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
  resolved: "bg-zinc-100 text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200",
} as const;

const STATUS_LABEL = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  resolved: "Resolved",
} as const;

const TABS = ["pending", "approved", "rejected", "resolved"] as const;

export default async function AdminRemovalRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const activeStatus =
    TABS.find((t) => t === sp.status) ?? "pending";

  const items = await fetchAdminRemovalRequests({ status: activeStatus });

  return (
    <AdminShell
      title="Removal requests"
      description="User / channel-owner takedown requests."
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
                      ? "/admin/removal-requests"
                      : `/admin/removal-requests?status=${t}`
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
            icon={Megaphone}
            title={`No ${activeStatus} requests`}
            description="Users submit takedown requests from a listing detail page (Phase 9)."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((r) => (
              <Card key={r.id} className="p-4">
                <li className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">
                          {r.requesterName}{" "}
                          <span className="font-mono text-xs font-normal text-muted-foreground">
                            ({r.requesterEmail})
                          </span>
                        </span>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "rounded-full",
                            STATUS_STYLES[r.status],
                          )}
                        >
                          {STATUS_LABEL[r.status]}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="capitalize">
                          {r.requesterType.replace("_", " ")}
                        </span>
                        {r.listingId && r.listingTitle && (
                          <Link
                            href={`/listings/${r.listingId}`}
                            className="text-primary hover:underline"
                          >
                            Listing: {r.listingTitle.slice(0, 60)}
                          </Link>
                        )}
                        {r.telegramChannelId && r.channelUsername && (
                          <span>
                            Channel:{" "}
                            <span className="font-medium text-foreground">
                              @{r.channelUsername}
                            </span>
                          </span>
                        )}
                        <span>· {formatRelative(r.createdAt)}</span>
                      </div>
                    </div>
                    {r.status === "pending" && (
                      <div className="flex flex-wrap gap-1.5">
                        <RemovalReviewDialog
                          removalId={r.id}
                          decision="approved"
                        />
                        <RemovalReviewDialog
                          removalId={r.id}
                          decision="rejected"
                        />
                        <RemovalReviewDialog
                          removalId={r.id}
                          decision="resolved"
                        />
                      </div>
                    )}
                  </div>
                  <div className="rounded-md bg-muted/30 px-3 py-2 text-xs">
                    <p className="font-medium text-foreground">Reason</p>
                    <p className="mt-1 text-muted-foreground">{r.reason}</p>
                    {r.note && (
                      <>
                        <p className="mt-2 font-medium text-foreground">
                          Additional note
                        </p>
                        <p className="mt-1 text-muted-foreground">{r.note}</p>
                      </>
                    )}
                  </div>
                  {r.adminNote && (
                    <p className="rounded-md bg-muted/50 px-3 py-2 text-xs">
                      <span className="font-medium text-foreground">
                        Admin note:
                      </span>{" "}
                      {r.adminNote}
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
