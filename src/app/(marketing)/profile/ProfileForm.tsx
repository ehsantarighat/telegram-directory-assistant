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
import {
  updateProfileAction,
  type ProfileFormState,
} from "@/lib/auth/profile-actions";
import type { UserProfile } from "@/db/schema";

type Props = {
  profile: UserProfile;
};

export function ProfileForm({ profile }: Props) {
  const [state, formAction, pending] = useActionState<
    ProfileFormState,
    FormData
  >(updateProfileAction, {});

  useEffect(() => {
    if (state.ok) toast.success("Profile updated");
  }, [state.ok]);

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-1.5">
        <label htmlFor="name" className="text-sm font-medium">
          Display name
        </label>
        <Input
          id="name"
          name="name"
          defaultValue={profile.name ?? ""}
          placeholder="Your name"
        />
        {state.fieldErrors?.name && (
          <p className="text-xs text-destructive">
            {state.fieldErrors.name}
          </p>
        )}
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="preferredLanguage" className="text-sm font-medium">
          Preferred language
        </label>
        <Select
          name="preferredLanguage"
          defaultValue={profile.preferredLanguage}
        >
          <SelectTrigger id="preferredLanguage" size="sm" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="ru">Russian (Русский)</SelectItem>
            <SelectItem value="uz">Uzbek (O&apos;zbek)</SelectItem>
            <SelectItem value="fa">Persian (فارسی)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-1.5">
        <label
          htmlFor="preferredContentMode"
          className="text-sm font-medium"
        >
          Content mode
        </label>
        <Select
          name="preferredContentMode"
          defaultValue={profile.preferredContentMode}
        >
          <SelectTrigger
            id="preferredContentMode"
            size="sm"
            className="w-full"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="original">
              Original — show source-language text
            </SelectItem>
            <SelectItem value="translated">
              Translated — auto-translate when available
            </SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Translation cache lookup activates in Phase 6.
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

      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
