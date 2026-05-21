import { CompassIcon } from "lucide-react";

import { EmptyState } from "@/components/states/EmptyState";
import { ListingFeedSkeleton } from "@/components/states/ListingCardSkeleton";
import { PageSection } from "@/components/states/PageSection";

export const metadata = {
  title: "Listings",
};

export default function ListingsPage() {
  return (
    <PageSection
      phase="Phase 1 · Placeholder"
      title="Browse listings"
      description="Mobile-first search with type, city, district, price and room filters lands in Phase 4. The skeleton below is the loading-state used by the real feed."
    >
      <div className="space-y-6">
        <ListingFeedSkeleton count={6} />
        <EmptyState
          icon={CompassIcon}
          title="Feed not wired yet"
          description="In Phase 4 this page binds to /api/listings and adds the FiltersDrawer + sort controls."
        />
      </div>
    </PageSection>
  );
}
