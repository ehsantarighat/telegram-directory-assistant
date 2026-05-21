"use client";

import { useState, useTransition } from "react";
import { ShieldOffIcon } from "lucide-react";
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
import {
  demoteAdminAction,
  type DemoteState,
} from "@/lib/admin/team-actions";

type Props = {
  userId: string;
  email: string;
  disabled?: boolean;
  disabledReason?: string;
};

/**
 * Confirm-before-demote button. The Phase 8 react-19 pattern:
 * useTransition + direct server-action call, no setState in effect.
 */
export function DemoteDialog({
  userId,
  email,
  disabled = false,
  disabledReason,
}: Props) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<DemoteState>({});
  const [pending, startTransition] = useTransition();

  const handleDemote = () => {
    const fd = new FormData();
    fd.set("userId", userId);
    startTransition(async () => {
      const result = await demoteAdminAction({}, fd);
      setState(result);
      if (result.ok) {
        toast.success(`${email} demoted to user`);
        setOpen(false);
      }
    });
  };

  if (disabled) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled
        className="gap-1.5 text-muted-foreground"
        title={disabledReason}
      >
        <ShieldOffIcon className="h-3.5 w-3.5" aria-hidden />
        Demote
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground hover:text-destructive"
          />
        }
      >
        <ShieldOffIcon className="h-3.5 w-3.5" aria-hidden />
        Demote
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Demote {email}?</DialogTitle>
          <DialogDescription>
            They lose access to <code>/admin</code> immediately. Their
            user_profile stays — only the role changes from admin to user.
          </DialogDescription>
        </DialogHeader>

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
          <Button
            type="button"
            size="sm"
            onClick={handleDemote}
            disabled={pending}
          >
            {pending ? "Demoting…" : "Demote"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
