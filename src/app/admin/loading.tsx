import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div className="flex min-h-full">
      <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:border-border md:bg-muted/30 md:p-4">
        <Skeleton className="mb-4 h-8 w-32" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center border-b border-border px-4">
          <Skeleton className="h-5 w-32" />
        </header>
        <main className="flex-1 p-6 md:p-8">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="p-4">
                <Skeleton className="mb-2 h-4 w-24" />
                <Skeleton className="h-8 w-16" />
              </Card>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
