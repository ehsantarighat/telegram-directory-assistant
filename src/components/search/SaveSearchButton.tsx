"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { BellPlusIcon, MailCheckIcon } from "lucide-react";
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
  saveSearchAction,
  type SaveSearchState,
} from "@/lib/saved-searches/actions";

type Props = {
  /** Show button only when at least one filter is active. */
  hasActiveFilters: boolean;
  /** Whether the viewer is signed in (controls the redirect target). */
  signedIn: boolean;
};

/**
 * "Save this search" button on /listings. Visible only when the user
 * has at least one filter applied — saving an empty search is just a
 * "follow everything" feed, which is what /listings already is.
 *
 * Saves the current URL's filter param snapshot to saved_searches with
 * alerts_enabled=false. Notifications don't ship in MVP; the saved
 * search is data-only until then (master spec: "no notification
 * logic in Phase 11").
 */
export function SaveSearchButton({ hasActiveFilters, signedIn }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<SaveSearchState>({});
  const [pending, startTransition] = useTransition();

  if (!hasActiveFilters) return null;

  const handleOpenChange = (next: boolean) => {
    if (!signedIn && next) {
      // Bounce anon users to login with a return URL preserving the
      // current filters so they land back on the same view.
      const here =
        `/listings${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
      router.push(`/login?next=${encodeURIComponent(here)}`);
      return;
    }
    setOpen(next);
    if (!next) setState({});
  };

  const formAction = (formData: FormData) => {
    // Serialize the current URL filters into the payload before submitting
    const filters: Record<string, string> = {};
    for (const [k, v] of searchParams.entries()) {
      if (k === "cursor" || k === "limit") continue;
      filters[k] = v;
    }
    formData.set("filtersJson", JSON.stringify(filters));

    startTransition(async () => {
      const result = await saveSearchAction({}, formData);
      setState(result);
      if (result.ok) {
        toast.success(result.message ?? "Search saved");
        setOpen(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            aria-label="Save this search"
          />
        }
      >
        <BellPlusIcon className="h-3.5 w-3.5" aria-hidden />
        Save search
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BellPlusIcon className="h-5 w-5 text-primary" aria-hidden />
            Save this search
          </DialogTitle>
          <DialogDescription>
            We&apos;ll store your current filters so you can re-run the
            search any time. <span className="font-medium">Alerts coming soon</span>{" "}
            — when notifications ship, this search can email or message you
            when new listings match.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="grid gap-3">
          <label className="flex flex-col gap-1.5 text-xs font-medium">
            <span className="text-muted-foreground uppercase tracking-wider">
              Name your search
            </span>
            <Input
              name="name"
              required
              autoFocus
              placeholder="2-room in Mirabad, under $700"
              maxLength={80}
              aria-invalid={!!state.fieldErrors?.name}
            />
            {state.fieldErrors?.name && (
              <span className="text-xs text-destructive">
                {state.fieldErrors.name}
              </span>
            )}
          </label>

          <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs">
            <p className="flex items-center gap-1.5 font-medium text-foreground">
              <MailCheckIcon className="h-3.5 w-3.5" aria-hidden />
              When alerts ship, you&apos;ll choose:
            </p>
            <ul className="mt-1 list-disc space-y-0.5 ps-5 text-muted-foreground">
              <li>Email digest (daily / weekly / instant)</li>
              <li>Telegram bot ping</li>
              <li>Web push (PWA)</li>
            </ul>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              For now we&apos;re saving the filters only — no notifications
              are sent.
            </p>
          </div>

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
              {pending ? "Saving…" : "Save search"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
