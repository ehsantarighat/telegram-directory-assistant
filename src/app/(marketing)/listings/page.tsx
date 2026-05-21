import { CompassIcon } from "lucide-react";

import { ActiveFilterChips } from "@/components/filters/ActiveFilterChips";
import { FiltersDrawer } from "@/components/filters/FiltersDrawer";
import { ListingFeedInfinite } from "@/components/search/ListingFeedInfinite";
import { SaveSearchButton } from "@/components/search/SaveSearchButton";
import { SearchBar } from "@/components/search/SearchBar";
import { SortSelect } from "@/components/search/SortSelect";
import { EmptyState } from "@/components/states/EmptyState";
import { getUser } from "@/lib/auth/getUser";
import {
  fetchListingFacets,
  fetchListings,
  listingsQuerySchema,
} from "@/lib/listings/query";
import { getSavedListingIds } from "@/lib/listings/saved";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Listings",
};

type SearchParams = Record<string, string | string[] | undefined>;

function flatten(params: SearchParams): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) out[k] = v[0] ?? "";
    else if (typeof v === "string") out[k] = v;
  }
  return out;
}

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const raw = flatten(await searchParams);
  const parsed = listingsQuerySchema.safeParse(raw);

  // "Active filters" = anything the user set beyond defaults. We
  // ignore pagination and the no-op default sort so the Save-search
  // button doesn't show on a stock /listings view.
  const PAGINATION_KEYS = new Set(["cursor", "limit"]);
  const hasActiveFilters = Object.entries(raw).some(([k, v]) => {
    if (PAGINATION_KEYS.has(k)) return false;
    if (k === "sort" && v === "newest") return false;
    return v != null && v.length > 0;
  });

  // Invalid query → render with defaults rather than 500; the chips above
  // will show whatever is in the URL so user can spot the issue.
  const query = parsed.success
    ? parsed.data
    : listingsQuerySchema.parse({});

  const [page, facets, user] = await Promise.all([
    fetchListings(query),
    fetchListingFacets(),
    getUser(),
  ]);

  const savedIds = user
    ? Array.from(
        await getSavedListingIds(
          user.id,
          page.items.map((i) => i.id),
        ),
      )
    : [];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 md:px-8 md:py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Real estate listings
        </h1>
        <p className="text-sm text-muted-foreground">
          {facets.cities.length > 0
            ? `Search ${facets.cities.length} cities · ${facets.channels.length} channels.`
            : "Search across all channels."}
        </p>
      </header>

      {/* Sticky search + actions */}
      <div className="sticky top-14 z-10 -mx-4 flex flex-col gap-2 bg-background/85 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/70 md:-mx-8 md:px-8">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
          <SearchBar className="md:flex-1" />
          <div className="flex items-center gap-2">
            <FiltersDrawer facets={facets} />
            <SortSelect />
            <SaveSearchButton
              hasActiveFilters={hasActiveFilters}
              signedIn={!!user}
            />
          </div>
        </div>
        <ActiveFilterChips />
      </div>

      {page.items.length === 0 ? (
        <EmptyState
          icon={CompassIcon}
          title="No listings match your filters"
          description="Try removing a filter, or broaden your search."
        />
      ) : (
        <ListingFeedInfinite
          key={JSON.stringify(query)}
          initial={page}
          savedIds={savedIds}
        />
      )}
    </div>
  );
}
