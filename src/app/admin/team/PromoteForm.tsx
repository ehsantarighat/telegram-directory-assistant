"use client";

import { useState, useTransition } from "react";
import { UserPlusIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  promoteToAdminAction,
  type PromoteState,
} from "@/lib/admin/team-actions";

export function PromoteForm() {
  const [state, setState] = useState<PromoteState>({});
  const [pending, startTransition] = useTransition();

  const formAction = (formData: FormData) => {
    startTransition(async () => {
      const result = await promoteToAdminAction({}, formData);
      setState(result);
      if (result.ok) {
        toast.success(result.message ?? "User promoted");
        // Clear the input on success by remounting via the form's key prop
        // change is handled by setState — the next render re-keys.
      }
    });
  };

  return (
    <form
      action={formAction}
      className="flex flex-col gap-2 sm:flex-row sm:items-start"
      key={state.ok ? `ok-${state.message}` : "fresh"}
    >
      <div className="flex flex-1 flex-col gap-1.5">
        <label
          htmlFor="email"
          className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
        >
          User email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          placeholder="newadmin@example.com"
          aria-invalid={!!state.fieldErrors?.email}
        />
        {state.fieldErrors?.email && (
          <p className="text-xs text-destructive">{state.fieldErrors.email}</p>
        )}
        <p className="text-xs text-muted-foreground">
          The user must already have an account (signed up at least once).
        </p>
      </div>
      <Button type="submit" disabled={pending} className="gap-1.5 sm:mt-[26px]">
        <UserPlusIcon className="h-4 w-4" aria-hidden />
        {pending ? "Promoting…" : "Promote to admin"}
      </Button>
    </form>
  );
}

