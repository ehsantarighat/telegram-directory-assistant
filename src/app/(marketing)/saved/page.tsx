import Link from "next/link";
import { BookmarkIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/states/EmptyState";
import { PageSection } from "@/components/states/PageSection";

export const metadata = {
  title: "Saved listings",
};

export default function SavedPage() {
  return (
    <PageSection
      phase="Phase 1 · Placeholder"
      title="Saved listings"
      description="Listings you save while browsing will appear here once auth + save/unsave lands in Phase 5."
    >
      <EmptyState
        icon={BookmarkIcon}
        title="Nothing saved yet"
        description="Sign in and tap the bookmark icon on any listing to save it for later."
        action={
          <Button render={<Link href="/login" />}>Sign in</Button>
        }
      />
    </PageSection>
  );
}
