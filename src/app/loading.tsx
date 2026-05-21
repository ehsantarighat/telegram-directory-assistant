import { ListingFeedSkeleton } from "@/components/states/ListingCardSkeleton";

export default function GlobalLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
      <div className="mb-6 h-6 w-40 animate-pulse rounded bg-muted" aria-hidden />
      <ListingFeedSkeleton />
    </div>
  );
}
