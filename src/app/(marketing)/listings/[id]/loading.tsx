import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ListingDetailLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-5 md:px-8 md:py-8">
      <Skeleton className="mb-4 h-8 w-32" />
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-5">
          <Skeleton className="aspect-[4/3] w-full rounded-xl" />
          <Card className="p-4 md:p-5">
            <div className="space-y-3">
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-10 w-1/3" />
              <div className="border-t border-border pt-3">
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <Skeleton className="mb-3 h-4 w-24" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex justify-between gap-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </Card>
        </div>
        <aside className="flex flex-col gap-4">
          <Card className="p-4">
            <Skeleton className="mb-3 h-5 w-32" />
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </Card>
          <Card className="p-4">
            <Skeleton className="mb-3 h-4 w-20" />
            <Skeleton className="h-9 w-full" />
          </Card>
        </aside>
      </div>
    </div>
  );
}
