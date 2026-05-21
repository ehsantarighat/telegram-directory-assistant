"use client";

import { useState, useTransition } from "react";
import { CheckIcon, CopyIcon, XIcon } from "lucide-react";
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
  reviewSuggestionAction,
  type SuggestionReviewState,
} from "@/lib/admin/suggestion-actions";
import { cn } from "@/lib/utils";

type Decision = "approved" | "rejected" | "duplicate";

const DECISION_META: Record<
  Decision,
  { label: string; description: string; icon: typeof CheckIcon; tone: string }
> = {
  approved: {
    label: "Approve",
    description:
      "Creates a telegram_channels row with status=active so ingestion can pick it up.",
    icon: CheckIcon,
    tone: "default",
  },
  rejected: {
    label: "Reject",
    description: "Marks the suggestion rejected. Channel is not added.",
    icon: XIcon,
    tone: "outline",
  },
  duplicate: {
    label: "Mark duplicate",
    description:
      "Use when the channel already exists in our directory under a different submission.",
    icon: CopyIcon,
    tone: "ghost",
  },
};

type Props = {
  suggestionId: string;
  decision: Decision;
  channelHandle: string;
};

export function SuggestionReviewDialog({
  suggestionId,
  decision,
  channelHandle,
}: Props) {
  const meta = DECISION_META[decision];
  const Icon = meta.icon;
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<SuggestionReviewState>({});
  const [pending, startTransition] = useTransition();

  const formAction = (formData: FormData) => {
    startTransition(async () => {
      const result = await reviewSuggestionAction({}, formData);
      setState(result);
      if (result.ok) {
        toast.success(`Suggestion ${decision}`);
        setOpen(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            size="sm"
            variant={
              decision === "approved"
                ? "default"
                : decision === "rejected"
                  ? "outline"
                  : "ghost"
            }
            className={cn("gap-1", meta.tone)}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {meta.label}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {meta.label} {channelHandle}?
          </DialogTitle>
          <DialogDescription>{meta.description}</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-3">
          <input type="hidden" name="suggestionId" value={suggestionId} />
          <input type="hidden" name="decision" value={decision} />
          <label className="flex flex-col gap-1.5 text-xs font-medium">
            <span className="text-muted-foreground uppercase tracking-wider">
              Admin note (optional)
            </span>
            <Textarea
              name="adminNote"
              rows={3}
              placeholder="Visible to the submitter on /suggest-channel"
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
