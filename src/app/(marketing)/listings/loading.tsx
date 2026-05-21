import { ListingFeedSkeleton } from "@/components/states/ListingCardSkeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function ListingsLoading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 md:px-8 md:py-8">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <Skeleton className="h-10 flex-1 rounded-full" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-32" />
      </div>
      <ListingFeedSkeleton count={6} />
    </div>
  );
}
