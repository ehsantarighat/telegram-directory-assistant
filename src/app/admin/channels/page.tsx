import { Radio } from "lucide-react";

import { AdminShell } from "@/components/shell/AdminShell";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/states/EmptyState";

export const metadata = {
  title: "Admin · Channels",
};

export default function AdminChannelsPage() {
  return (
    <AdminShell
      title="Channels"
      description="Add, enable, disable, and tag the Telegram channels we ingest from."
      actions={
        <Button size="sm" disabled>
          Add channel
        </Button>
      }
    >
      <EmptyState
        icon={Radio}
        title="No channels yet"
        description="In Phase 8 you’ll be able to add channels manually here. Listing-level sync status, last error, and post counts will live in this table."
      />
    </AdminShell>
  );
}
