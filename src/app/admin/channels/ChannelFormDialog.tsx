"use client";

import { useState, useTransition } from "react";
import { PencilIcon, PlusIcon } from "lucide-react";
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
import {
  upsertChannelAction,
  type ChannelFormState,
} from "@/lib/admin/channel-actions";

type Category = { id: string; name: string };

type Defaults = {
  id?: string;
  title?: string;
  channelInput?: string;
  categoryId?: string;
  country?: string;
  city?: string;
  language?: string;
  syncIntervalMinutes?: number;
};

type Props = {
  categories: Category[];
  mode: "add" | "edit";
  defaults?: Defaults;
  triggerClassName?: string;
};

export function ChannelFormDialog({
  categories,
  mode,
  defaults,
  triggerClassName,
}: Props) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<ChannelFormState>({});
  const [pending, startTransition] = useTransition();

  const formAction = (formData: FormData) => {
    startTransition(async () => {
      const result = await upsertChannelAction({}, formData);
      setState(result);
      if (result.ok) {
        toast.success(mode === "add" ? "Channel added" : "Channel updated");
        setOpen(false);
      }
    });
  };

  const initialCategoryId = defaults?.categoryId ?? categories[0]?.id ?? "";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          mode === "add" ? (
            <Button size="sm" className={triggerClassName}>
              <PlusIcon className="h-4 w-4" aria-hidden />
              Add channel
            </Button>
          ) : (
            <Button
              size="icon-sm"
              variant="ghost"
              className={triggerClassName}
              aria-label="Edit channel"
            >
              <PencilIcon className="h-4 w-4" aria-hidden />
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "add" ? "Add Telegram channel" : "Edit channel"}
          </DialogTitle>
          <DialogDescription>
            Public Telegram channels only. Ingestion picks up new channels
            on the next sync cycle.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="grid gap-3" key={open ? "open" : "closed"}>
          {defaults?.id && (
            <input type="hidden" name="id" value={defaults.id} />
          )}

          <Field label="Display title" error={state.fieldErrors?.title}>
            <Input
              name="title"
              required
              defaultValue={defaults?.title ?? ""}
              placeholder="Tashkent Real Estate"
            />
          </Field>

          <Field
            label="Telegram URL or @username"
            error={state.fieldErrors?.channelInput}
          >
            <Input
              name="channelInput"
              required
              defaultValue={defaults?.channelInput ?? ""}
              placeholder="https://t.me/uz_realty_tashkent"
            />
          </Field>

          <Field label="Category" error={state.fieldErrors?.categoryId}>
            <Select name="categoryId" defaultValue={initialCategoryId}>
              <SelectTrigger size="sm" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Country">
              <Input
                name="country"
                defaultValue={defaults?.country ?? ""}
                placeholder="Uzbekistan"
              />
            </Field>
            <Field label="City">
              <Input
                name="city"
                defaultValue={defaults?.city ?? ""}
                placeholder="Tashkent"
              />
            </Field>
          </div>

          <Field label="Language code (optional)">
            <Input
              name="language"
              defaultValue={defaults?.language ?? ""}
              placeholder="ru, uz, en, fa"
              maxLength={8}
            />
          </Field>

          <Field
            label="Auto-sync interval (minutes)"
            error={state.fieldErrors?.syncIntervalMinutes}
          >
            <Input
              name="syncIntervalMinutes"
              type="number"
              min={0}
              max={10080}
              step={5}
              defaultValue={defaults?.syncIntervalMinutes ?? 60}
              placeholder="60"
            />
            <span className="text-[11px] font-normal normal-case tracking-normal text-muted-foreground">
              How often the cron picks this channel. 15 = busy channel, 360 = slow channel, 0 = disable auto-sync (manual still works).
            </span>
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
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Saving…" : mode === "add" ? "Add channel" : "Save"}
            </Button>
          </DialogFooter>
        </form>
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
