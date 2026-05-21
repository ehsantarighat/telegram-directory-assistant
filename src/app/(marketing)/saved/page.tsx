import { BookmarkIcon } from "lucide-react";

import { ListingCard } from "@/components/listings/ListingCard";
import { EmptyState } from "@/components/states/EmptyState";
import { PageSection } from "@/components/states/PageSection";
import { requireUser } from "@/lib/auth/requireUser";
import { fetchSavedListings } from "@/lib/listings/saved";

export const metadata = {
  title: "Saved listings",
};

export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const { user } = await requireUser("/saved");
  const items = await fetchSavedListings(user.id);

  return (
    <PageSection
      title="Saved listings"
      description={
        items.length > 0
          ? `${items.length} listing${items.length === 1 ? "" : "s"} saved`
          : "Your bookmarked listings will appear here."
      }
    >
      {items.length === 0 ? (
        <EmptyState
          icon={BookmarkIcon}
          title="Nothing saved yet"
          description="Tap the bookmark icon on any listing to save it for later."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              initialSaved
            />
          ))}
        </div>
      )}
    </PageSection>
  );
}
