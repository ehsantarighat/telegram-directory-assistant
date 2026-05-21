import { CompassIcon } from "lucide-react";

import { AdminShell } from "@/components/shell/AdminShell";
import { EmptyState } from "@/components/states/EmptyState";

export const metadata = {
  title: "Admin · Listings",
};

export default function AdminListingsPage() {
  return (
    <AdminShell
      title="Listings"
      description="Search, filter, hide, or mark listings as removed. View source channels and duplicate groups."
    >
      <EmptyState
        icon={CompassIcon}
        title="Listing admin table coming in Phase 8"
        description="Once Phase 2 (schema) and Phase 3 (seed) land, this page will show a filtered admin table over the full listings dataset."
      />
    </AdminShell>
  );
}
