import Link from "next/link";
import {
  ArrowRightIcon,
  BookmarkIcon,
  CompassIcon,
  Lightbulb,
  Megaphone,
  Radio,
  Users2Icon,
} from "lucide-react";

import { AdminShell } from "@/components/shell/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListingTypeBadge } from "@/components/listings/ListingTypeBadge";
import { fetchOverviewStats } from "@/lib/admin/stats";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Admin · Overview",
};

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const stats = await fetchOverviewStats();

  const STATS: Array<{
    label: string;
    value: number;
    href?: string;
    icon: typeof Users2Icon;
    badge?: { label: string; tone: "default" | "warn" };
  }> = [
    { label: "Users", value: stats.users, icon: Users2Icon },
    {
      label: "Active channels",
      value: stats.activeChannels,
      href: "/admin/channels",
      icon: Radio,
    },
    {
      label: "Listings",
      value: stats.activeListings,
      href: "/admin/listings",
      icon: CompassIcon,
    },
    { label: "Saved listings", value: stats.savedListings, icon: BookmarkIcon },
    {
      label: "Pending suggestions",
      value: stats.pendingSuggestions,
      href: "/admin/channel-suggestions",
      icon: Lightbulb,
      badge: stats.pendingSuggestions > 0
        ? { label: "Needs review", tone: "warn" }
        : undefined,
    },
    {
      label: "Open removal requests",
      value: stats.openRemovalRequests,
      href: "/admin/removal-requests",
      icon: Megaphone,
      badge: stats.openRemovalRequests > 0
        ? { label: "Needs review", tone: "warn" }
        : undefined,
    },
  ];

  return (
    <AdminShell
      title="Overview"
      description="Operational health, channels, and content moderation."
    >
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STATS.map((s) => {
            const Icon = s.icon;
            const content = (
              <Card
                className={cn(
                  "h-full transition-shadow",
                  s.href && "hover:shadow-md",
                )}
              >
                <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                  <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {s.label}
                  </CardTitle>
                  <Icon
                    className="h-4 w-4 text-muted-foreground"
                    aria-hidden
                  />
                </CardHeader>
                <CardContent className="flex items-baseline justify-between">
                  <p className="text-3xl font-semibold tabular-nums">
                    {s.value.toLocaleString()}
                  </p>
                  {s.badge && (
                    <Badge
                      variant={s.badge.tone === "warn" ? "destructive" : "secondary"}
                      className="rounded-full text-[10px]"
                    >
                      {s.badge.label}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            );
            return s.href ? (
              <Link key={s.label} href={s.href}>
                {content}
              </Link>
            ) : (
              <div key={s.label}>{content}</div>
            );
          })}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Most saved listings</CardTitle>
              <Link
                href="/admin/listings"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                All listings
                <ArrowRightIcon className="h-3 w-3" aria-hidden />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {stats.mostSavedListings.length === 0 ? (
                <p className="px-4 pb-4 text-sm text-muted-foreground">
                  No saved listings yet.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {stats.mostSavedListings.map((l) => (
                    <li
                      key={l.id}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="flex min-w-0 flex-col gap-1">
                        <Link
                          href={`/listings/${l.id}`}
                          className="line-clamp-1 text-sm font-medium hover:underline"
                        >
                          {l.title}
                        </Link>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <ListingTypeBadge type={l.listingType} />
                          {l.city && <span>· {l.city}</span>}
                        </div>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold">
                        <BookmarkIcon className="h-3.5 w-3.5" aria-hidden />
                        {l.savedCount}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Most active channels</CardTitle>
              <Link
                href="/admin/channels"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                All channels
                <ArrowRightIcon className="h-3 w-3" aria-hidden />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {stats.mostActiveChannels.length === 0 ? (
                <p className="px-4 pb-4 text-sm text-muted-foreground">
                  No channels yet.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {stats.mostActiveChannels.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="line-clamp-1 text-sm font-medium">
                          {c.title}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                          @{c.username}
                        </span>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-0.5 text-xs text-muted-foreground">
                        <span className="text-sm font-semibold text-foreground">
                          {c.listingCount} listings
                        </span>
                        <span>{c.postsImportedCount.toLocaleString()} posts</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminShell>
  );
}
