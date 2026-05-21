import { redirect } from "next/navigation";

import { getProfile } from "./getProfile";
import { getUser } from "./getUser";

/**
 * Guard for Server Components / route handlers that require an
 * authenticated user.
 *
 * Redirects to /login with `?next=<encoded current path>` so the auth
 * pages can bounce the user back where they were after signing in.
 *
 * Returns `{user, profile}` for the caller. If the profile somehow
 * doesn't exist (trigger race), still redirects to /login — the
 * profile-creation trigger will retry on the next session refresh.
 */
export async function requireUser(currentPath?: string) {
  const user = await getUser();
  if (!user) {
    const next = currentPath ? `?next=${encodeURIComponent(currentPath)}` : "";
    redirect(`/login${next}`);
  }

  const profile = await getProfile(user.id);
  if (!profile) {
    const next = currentPath ? `?next=${encodeURIComponent(currentPath)}` : "";
    redirect(`/login${next}`);
  }

  return { user, profile };
}

export async function requireAdmin(currentPath?: string) {
  const { user, profile } = await requireUser(currentPath);
  if (profile.role !== "admin") {
    redirect("/");
  }
  return { user, profile };
}
