import { ListingFeedSkeleton } from "@/components/states/ListingCardSkeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function SavedLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:py-12">
      <div className="mb-6 flex flex-col gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <ListingFeedSkeleton count={3} />
    </div>
  );
}
