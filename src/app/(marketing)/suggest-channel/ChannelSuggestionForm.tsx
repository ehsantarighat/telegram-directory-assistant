"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
  suggestChannelAction,
  type SuggestionFormState,
} from "@/lib/channel-suggestions/actions";

type Category = {
  id: string;
  name: string;
  slug: string;
};

type Props = {
  categories: Category[];
};

export function ChannelSuggestionForm({ categories }: Props) {
  const [state, formAction, pending] = useActionState<
    SuggestionFormState,
    FormData
  >(suggestChannelAction, {});

  useEffect(() => {
    if (state.ok) toast.success(state.message ?? "Suggestion submitted");
  }, [state.ok, state.message]);

  const defaultCategoryId = categories[0]?.id ?? "";

  return (
    <form action={formAction} className="grid gap-4" key={state.ok ? "ok" : "form"}>
      <div className="grid gap-1.5">
        <label htmlFor="channelInput" className="text-sm font-medium">
          Telegram channel URL or @username
        </label>
        <Input
          id="channelInput"
          name="channelInput"
          placeholder="https://t.me/uz_realty_tashkent  ·  @uz_realty_tashkent"
          required
          aria-invalid={!!state.fieldErrors?.channelInput}
        />
        {state.fieldErrors?.channelInput && (
          <p className="text-xs text-destructive">
            {state.fieldErrors.channelInput}
          </p>
        )}
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="categoryId" className="text-sm font-medium">
          Suggested category
        </label>
        <Select name="categoryId" defaultValue={defaultCategoryId}>
          <SelectTrigger id="categoryId" size="sm" className="w-full">
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
        {state.fieldErrors?.categoryId && (
          <p className="text-xs text-destructive">
            {state.fieldErrors.categoryId}
          </p>
        )}
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="city" className="text-sm font-medium">
          Suggested city <span className="text-muted-foreground">(optional)</span>
        </label>
        <Input
          id="city"
          name="city"
          placeholder="Tashkent, Samarkand, Bukhara…"
        />
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="note" className="text-sm font-medium">
          Note <span className="text-muted-foreground">(optional)</span>
        </label>
        <Textarea
          id="note"
          name="note"
          rows={3}
          placeholder="What kind of listings does this channel post? Anything admins should know?"
          className="resize-none"
        />
      </div>

      {state.error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
        >
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Submitting…" : "Submit suggestion"}
        </Button>
        <span className="text-xs text-muted-foreground">
          An admin reviews it before the channel goes live.
        </span>
      </div>
    </form>
  );
}
