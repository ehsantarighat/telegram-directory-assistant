import Link from "next/link";
import { ExternalLinkIcon, Loader2Icon, Radio } from "lucide-react";

import { AdminShell } from "@/components/shell/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/states/EmptyState";
import { fetchActiveCategories } from "@/lib/channel-suggestions/queries";
import { fetchAdminChannels } from "@/lib/admin/channel-queries";
import { formatRelative } from "@/lib/format/date";
import { cn } from "@/lib/utils";

import { ChannelFormDialog } from "./ChannelFormDialog";
import { ChannelStatusForm } from "./ChannelStatusForm";
import { SyncButton } from "./SyncButton";

export const metadata = {
  title: "Admin · Channels",
};

export const dynamic = "force-dynamic";

const STATUS_STYLES = {
  active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  disabled: "bg-zinc-100 text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200",
  removed: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
} as const;

export default async function AdminChannelsPage() {
  const [channels, categories] = await Promise.all([
    fetchAdminChannels(),
    fetchActiveCategories(),
  ]);

  const pickerCategories = categories.map((c) => ({ id: c.id, name: c.name }));

  return (
    <AdminShell
      title="Channels"
      description="Add, enable, disable, and tag the Telegram channels we ingest from."
      actions={<ChannelFormDialog categories={pickerCategories} mode="add" />}
    >
      {channels.length === 0 ? (
        <EmptyState
          icon={Radio}
          title="No channels yet"
          description="Add the first Telegram channel using the button in the top right."
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">Channel</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Category</th>
                  <th className="px-4 py-2 text-left">Location</th>
                  <th className="px-4 py-2 text-left">Posts</th>
                  <th className="px-4 py-2 text-left">Last sync</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {channels.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">{c.title}</span>
                        <Link
                          href={c.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground"
                        >
                          @{c.username}
                          <ExternalLinkIcon
                            className="h-3 w-3"
                            aria-hidden
                          />
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <ChannelStatusForm
                        channelId={c.id}
                        current={
                          c.status === "active" ||
                          c.status === "disabled" ||
                          c.status === "removed"
                            ? c.status
                            : "disabled"
                        }
                      />
                      {c.status === "pending" && (
                        <Badge
                          variant="secondary"
                          className={cn(
                            "ml-2 rounded-full",
                            STATUS_STYLES.pending,
                          )}
                        >
                          Pending
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.categoryName ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {[c.city, c.country].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {c.postsImportedCount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {c.lastSyncStatus === "running" ? (
                        <div className="flex flex-col">
                          <span className="inline-flex items-center gap-1.5 text-foreground">
                            <Loader2Icon
                              className="h-3 w-3 animate-spin"
                              aria-hidden
                            />
                            Syncing…
                          </span>
                          {c.lastSyncError && (
                            <span className="text-[11px] text-muted-foreground">
                              {c.lastSyncError}
                            </span>
                          )}
                        </div>
                      ) : c.lastSyncStatus === "stalled" ? (
                        <div className="flex flex-col">
                          <span className="text-amber-600 dark:text-amber-400">
                            ⚠ Stalled
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            Click Run sync to retry
                          </span>
                        </div>
                      ) : c.lastSyncedAt ? (
                        <div className="flex flex-col">
                          <span>{formatRelative(c.lastSyncedAt)}</span>
                          {c.lastSyncError && (
                            <span className="text-destructive">
                              ⚠ {c.lastSyncError.slice(0, 60)}
                            </span>
                          )}
                        </div>
                      ) : c.lastSyncError ? (
                        <span className="text-destructive">
                          ⚠ {c.lastSyncError.slice(0, 60)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <SyncButton
                          channelId={c.id}
                          disabled={c.status !== "active"}
                        />
                        <ChannelFormDialog
                          categories={pickerCategories}
                          mode="edit"
                          defaults={{
                            id: c.id,
                            title: c.title,
                            channelInput: c.url,
                            categoryId: c.categoryId,
                            country: c.country ?? "",
                            city: c.city ?? "",
                            language: c.language ?? "",
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </AdminShell>
  );
}
