import Link from "next/link";
import { CompassIcon, GitMergeIcon } from "lucide-react";

import { AdminShell } from "@/components/shell/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/states/EmptyState";
import { ListingTypeBadge } from "@/components/listings/ListingTypeBadge";
import { formatRelative } from "@/lib/format/date";
import { formatPrice, priceSuffix } from "@/lib/format/price";
import {
  fetchAdminListings,
  type AdminListingsQuery,
} from "@/lib/admin/listing-queries";

import { AdminListingFilters } from "./AdminListingFilters";
import { ListingStatusForm } from "./ListingStatusForm";

export const metadata = {
  title: "Admin · Listings",
};

export const dynamic = "force-dynamic";

const VALID_STATUSES = new Set([
  "active",
  "hidden",
  "removed",
  "duplicate",
  "incomplete",
]);
const VALID_TYPES = new Set(["rent", "sale", "daily_rent"]);

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; type?: string }>;
}) {
  const sp = await searchParams;
  const query: AdminListingsQuery = {};
  if (typeof sp.q === "string" && sp.q.trim()) query.q = sp.q.trim();
  if (typeof sp.status === "string" && VALID_STATUSES.has(sp.status)) {
    query.status = sp.status as AdminListingsQuery["status"];
  }
  if (typeof sp.type === "string" && VALID_TYPES.has(sp.type)) {
    query.type = sp.type as AdminListingsQuery["type"];
  }

  const items = await fetchAdminListings(query);

  return (
    <AdminShell
      title="Listings"
      description="Search, hide, or remove listings. View source channels and duplicate groups."
    >
      <div className="space-y-4">
        <AdminListingFilters />

        {items.length === 0 ? (
          <EmptyState
            icon={CompassIcon}
            title="No listings match"
            description="Adjust the filters or try a different search term."
          />
        ) : (
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left">Listing</th>
                    <th className="px-4 py-2 text-left">Type</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Source</th>
                    <th className="px-4 py-2 text-left">Price</th>
                    <th className="px-4 py-2 text-left">Counts</th>
                    <th className="px-4 py-2 text-left">Posted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((l) => (
                    <tr key={l.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <Link
                            href={`/listings/${l.id}`}
                            className="line-clamp-1 font-medium hover:underline"
                          >
                            {l.title}
                          </Link>
                          <span className="text-xs text-muted-foreground">
                            {[l.district, l.city].filter(Boolean).join(", ") ||
                              "—"}
                          </span>
                          {l.duplicateGroupId && (
                            <Badge
                              variant="secondary"
                              className="mt-1 w-fit gap-1 rounded-full text-[10px]"
                            >
                              <GitMergeIcon
                                className="h-3 w-3"
                                aria-hidden
                              />
                              duplicate group
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <ListingTypeBadge type={l.listingType} />
                      </td>
                      <td className="px-4 py-3">
                        <ListingStatusForm
                          listingId={l.id}
                          current={l.status}
                        />
                      </td>
                      <td className="px-4 py-3">
                        {l.primaryChannel ? (
                          <div className="flex flex-col">
                            <span className="text-xs">
                              {l.primaryChannel.title}
                            </span>
                            <span className="font-mono text-[11px] text-muted-foreground">
                              @{l.primaryChannel.username}
                            </span>
                            {l.sourceCount > 1 && (
                              <span className="text-[11px] text-muted-foreground">
                                +{l.sourceCount - 1} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatPrice(l.price, l.currency, {
                          suffix: priceSuffix(l.listingType),
                        })}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        <div className="flex flex-col">
                          <span>{l.savedCount} saved</span>
                          <span>{l.sourceCount} src</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {l.publishedAt ? formatRelative(l.publishedAt) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
        <p className="text-xs text-muted-foreground">
          Showing up to 100 listings ordered by publish date. Refine with
          filters above.
        </p>
      </div>
    </AdminShell>
  );
}
