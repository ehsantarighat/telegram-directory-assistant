import Link from "next/link";
import { LogOutIcon, ShieldIcon, UserIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { signOutAction } from "@/lib/auth/actions";
import { getProfile } from "@/lib/auth/getProfile";
import { getUser } from "@/lib/auth/getUser";

/**
 * Top-bar user widget. Server-rendered so the signed-in state is
 * available immediately, no client-side flicker.
 *
 *   logged out → "Sign in" button
 *   logged in  → display name (or email prefix) + small sign-out icon
 *
 * Admins get a shield icon next to their name as a hint that the
 * /admin section is accessible.
 */
export async function UserMenu() {
  const user = await getUser();

  if (!user) {
    return (
      <Button
        render={<Link href="/login" />}
        variant="ghost"
        size="sm"
        className="gap-1.5"
      >
        <UserIcon className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">Sign in</span>
      </Button>
    );
  }

  const profile = await getProfile(user.id);
  const displayName =
    profile?.name ?? user.email?.split("@")[0] ?? "Account";
  const isAdmin = profile?.role === "admin";

  return (
    <div className="flex items-center gap-1">
      <Button
        render={<Link href="/profile" />}
        variant="ghost"
        size="sm"
        className="max-w-[140px] gap-1.5"
        aria-label="Open your profile"
      >
        {isAdmin && <ShieldIcon className="h-3.5 w-3.5 text-primary" aria-hidden />}
        <span className="truncate font-medium">{displayName}</span>
      </Button>
      <form action={signOutAction}>
        <Button
          type="submit"
          variant="ghost"
          size="icon-sm"
          aria-label="Sign out"
        >
          <LogOutIcon className="h-4 w-4" aria-hidden />
        </Button>
      </form>
    </div>
  );
}
