"use client";

import { useState, useTransition } from "react";
import { CheckIcon, ClockIcon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  reviewRemovalRequestAction,
  type RemovalReviewState,
} from "@/lib/admin/removal-actions";

type Decision = "approved" | "rejected" | "resolved";

const META: Record<
  Decision,
  { label: string; icon: typeof CheckIcon; description: string; variant: "default" | "outline" | "ghost" }
> = {
  approved: {
    label: "Approve",
    icon: CheckIcon,
    variant: "default",
    description:
      "Marks the linked listing and/or channel as removed so they disappear from the public feed.",
  },
  rejected: {
    label: "Reject",
    icon: XIcon,
    variant: "outline",
    description:
      "Closes the request without changing the listing/channel.",
  },
  resolved: {
    label: "Resolve",
    icon: ClockIcon,
    variant: "ghost",
    description:
      "Closes the request when the issue was handled out-of-band (e.g. requester withdrew).",
  },
};

type Props = {
  removalId: string;
  decision: Decision;
};

export function RemovalReviewDialog({ removalId, decision }: Props) {
  const meta = META[decision];
  const Icon = meta.icon;
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<RemovalReviewState>({});
  const [pending, startTransition] = useTransition();

  const formAction = (formData: FormData) => {
    startTransition(async () => {
      const result = await reviewRemovalRequestAction({}, formData);
      setState(result);
      if (result.ok) {
        toast.success(`Request ${decision}`);
        setOpen(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant={meta.variant} className="gap-1">
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {meta.label}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{meta.label} this request?</DialogTitle>
          <DialogDescription>{meta.description}</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-3">
          <input type="hidden" name="removalId" value={removalId} />
          <input type="hidden" name="decision" value={decision} />
          <label className="flex flex-col gap-1.5 text-xs font-medium">
            <span className="text-muted-foreground uppercase tracking-wider">
              Admin note (optional)
            </span>
            <Textarea
              name="adminNote"
              rows={3}
              placeholder="Internal note for the audit trail"
              className="resize-none"
            />
          </label>
          {state.error && (
            <p
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
            >
              {state.error}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Saving…" : meta.label}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
