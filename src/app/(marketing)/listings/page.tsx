import { CompassIcon } from "lucide-react";

import { ActiveFilterChips } from "@/components/filters/ActiveFilterChips";
import { FiltersDrawer } from "@/components/filters/FiltersDrawer";
import { ListingFeedInfinite } from "@/components/search/ListingFeedInfinite";
import { SearchBar } from "@/components/search/SearchBar";
import { SortSelect } from "@/components/search/SortSelect";
import { EmptyState } from "@/components/states/EmptyState";
import {
  fetchListingFacets,
  fetchListings,
  listingsQuerySchema,
} from "@/lib/listings/query";

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

  // Invalid query → render with defaults rather than 500; the chips above
  // will show whatever is in the URL so user can spot the issue.
  const query = parsed.success
    ? parsed.data
    : listingsQuerySchema.parse({});

  const [page, facets] = await Promise.all([
    fetchListings(query),
    fetchListingFacets(),
  ]);

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
        />
      )}
    </div>
  );
}
