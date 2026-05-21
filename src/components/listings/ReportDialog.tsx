"use client";

import { useState, useTransition } from "react";
import { FlagIcon, MailCheckIcon } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  submitRemovalRequestAction,
  type RemovalSubmitState,
} from "@/lib/removal-requests/actions";
import { cn } from "@/lib/utils";

type Props = {
  listingId: string;
  /** If the listing has a primary source channel, pass it so the
   *  submission auto-attaches the channel for admin action. */
  channelId?: string | null;
  /** Defaults from the signed-in user's profile (server-rendered). */
  defaultName?: string | null;
  defaultEmail?: string | null;
  variant?: "icon" | "labeled";
  className?: string;
};

const REQUESTER_OPTIONS = [
  { value: "user", label: "I'm a user reporting an issue" },
  { value: "channel_owner", label: "I'm the channel owner" },
  { value: "other", label: "Other" },
] as const;

/**
 * "Report listing" dialog on /listings/[id]. Anonymous-friendly per
 * master spec — requester name + email are part of the form, not auth.
 *
 * On success the form region swaps to a confirmation card without
 * closing the dialog (so the user has time to read the receipt before
 * dismissing).
 */
export function ReportDialog({
  listingId,
  channelId,
  defaultName,
  defaultEmail,
  variant = "labeled",
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<RemovalSubmitState>({});
  const [pending, startTransition] = useTransition();

  const formAction = (formData: FormData) => {
    startTransition(async () => {
      const result = await submitRemovalRequestAction({}, formData);
      setState(result);
      if (result.ok) {
        toast.success("Report submitted");
      }
    });
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    // Reset state when the dialog closes so a re-open shows a fresh form.
    if (!next) setState({});
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          variant === "icon" ? (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Report this listing"
              className={cn("shrink-0 text-muted-foreground", className)}
            />
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "gap-1.5 text-muted-foreground hover:text-foreground",
                className,
              )}
            />
          )
        }
      >
        <FlagIcon className="h-4 w-4" aria-hidden />
        {variant === "labeled" && "Report"}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report this listing</DialogTitle>
          <DialogDescription>
            We index publicly-posted Telegram content. If a listing
            shouldn&apos;t be here — wrong source, scam, takedown
            request — let us know and an admin will review.
          </DialogDescription>
        </DialogHeader>

        {state.ok ? (
          <div className="flex flex-col items-start gap-3 rounded-md border border-border bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <MailCheckIcon
                className="h-4 w-4 text-primary"
                aria-hidden
              />
              Thanks — your report is in the queue
            </div>
            <p className="text-xs text-muted-foreground">
              An admin will review and decide on next steps. You don&apos;t
              need to do anything else; we&apos;ll email you if we need
              more info.
            </p>
            <Button size="sm" onClick={() => handleOpenChange(false)}>
              Done
            </Button>
          </div>
        ) : (
          <form action={formAction} className="grid gap-3">
            <input type="hidden" name="listingId" value={listingId} />
            {channelId && (
              <input
                type="hidden"
                name="telegramChannelId"
                value={channelId}
              />
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Your name"
                error={state.fieldErrors?.requesterName}
              >
                <Input
                  name="requesterName"
                  required
                  autoComplete="name"
                  defaultValue={defaultName ?? ""}
                />
              </Field>
              <Field
                label="Email"
                error={state.fieldErrors?.requesterEmail}
              >
                <Input
                  name="requesterEmail"
                  type="email"
                  required
                  autoComplete="email"
                  defaultValue={defaultEmail ?? ""}
                />
              </Field>
            </div>

            <Field
              label="I'm reporting as"
              error={state.fieldErrors?.requesterType}
            >
              <Select name="requesterType" defaultValue="user">
                <SelectTrigger size="sm" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REQUESTER_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="What's the issue?" error={state.fieldErrors?.reason}>
              <Textarea
                name="reason"
                required
                rows={3}
                placeholder="Inaccurate, scam, my content, illegal, etc."
                className="resize-none"
              />
            </Field>

            <Field label="Additional note (optional)">
              <Textarea
                name="note"
                rows={2}
                placeholder="Anything else admins should know?"
                className="resize-none"
              />
            </Field>

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
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? "Submitting…" : "Submit report"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-xs font-medium">
      <span className="text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      {children}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </label>
  );
}
