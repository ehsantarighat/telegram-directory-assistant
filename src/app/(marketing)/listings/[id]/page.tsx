import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageSection } from "@/components/states/PageSection";

export const metadata = {
  title: "Listing detail",
};

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <PageSection
      phase="Phase 1 · Placeholder"
      title={`Listing ${id.slice(0, 8)}…`}
      description="Detail page with media gallery, full original text, structured fields, source channels, translate, save, share and report controls lands in Phase 4."
    >
      <div className="flex flex-col items-start gap-3">
        <Button render={<Link href="/listings" />} variant="secondary" size="sm">
          <ArrowLeftIcon className="h-4 w-4" />
          Back to listings
        </Button>
        <p className="text-sm text-muted-foreground">
          The detail page consumes <code className="rounded bg-muted px-1.5 py-0.5">GET /api/listings/{id}</code>{" "}
          and renders the source-attribution panel, duplicate-sources list, and on-demand translation toggle.
        </p>
      </div>
    </PageSection>
  );
}
