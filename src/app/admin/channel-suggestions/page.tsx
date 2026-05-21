import { Lightbulb } from "lucide-react";

import { AdminShell } from "@/components/shell/AdminShell";
import { EmptyState } from "@/components/states/EmptyState";

export const metadata = {
  title: "Admin · Channel suggestions",
};

export default function AdminChannelSuggestionsPage() {
  return (
    <AdminShell
      title="Channel suggestions"
      description="Review user-submitted channel suggestions. Approve, reject, or mark as duplicate."
    >
      <EmptyState
        icon={Lightbulb}
        title="No suggestions yet"
        description="When users submit a Telegram channel via /suggest-channel (Phase 7), it lands here for review."
      />
    </AdminShell>
  );
}
