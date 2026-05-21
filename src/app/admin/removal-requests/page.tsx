import { Megaphone } from "lucide-react";

import { AdminShell } from "@/components/shell/AdminShell";
import { EmptyState } from "@/components/states/EmptyState";

export const metadata = {
  title: "Admin · Removal requests",
};

export default function AdminRemovalRequestsPage() {
  return (
    <AdminShell
      title="Removal requests"
      description="User and channel-owner takedown / report requests. Approve, reject, or resolve."
    >
      <EmptyState
        icon={Megaphone}
        title="No removal requests yet"
        description="Users submit removal requests from a listing detail page (Phase 9). Approved requests can mark a listing or channel as removed."
      />
    </AdminShell>
  );
}
