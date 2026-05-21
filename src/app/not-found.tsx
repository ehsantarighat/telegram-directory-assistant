import Link from "next/link";
import { CompassIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/states/EmptyState";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <EmptyState
        icon={CompassIcon}
        title="Page not found"
        description="The page you’re looking for doesn’t exist or has been moved."
        action={
          <Button render={<Link href="/listings" />}>Browse listings</Button>
        }
      />
    </div>
  );
}
