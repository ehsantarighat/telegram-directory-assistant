"use client";

import { useTransition } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setChannelStatusAction } from "@/lib/admin/channel-actions";

type Status = "active" | "disabled" | "removed";

type Props = {
  channelId: string;
  current: Status;
};

const LABELS: Record<Status, string> = {
  active: "Active",
  disabled: "Disabled",
  removed: "Removed",
};

/**
 * In-row status switcher. Each option triggers the server action via a
 * hidden form submit so the admin can flip status without opening an
 * edit dialog.
 */
export function ChannelStatusForm({ channelId, current }: Props) {
  const [pending, startTransition] = useTransition();

  const handleChange = (value: string | null) => {
    if (!value || value === current) return;
    const fd = new FormData();
    fd.set("channelId", channelId);
    fd.set("status", value);
    startTransition(async () => {
      await setChannelStatusAction(fd);
    });
  };

  return (
    <Select
      value={current}
      onValueChange={handleChange}
      disabled={pending}
    >
      <SelectTrigger size="sm" className="w-[110px]" aria-label="Channel status">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(LABELS) as Status[]).map((s) => (
          <SelectItem key={s} value={s}>
            {LABELS[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
