import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Return the currently-signed-in Supabase user, or null.
 *
 * Use this from Server Components and route handlers. The proxy.ts
 * middleware refreshes the session cookie on every request so this
 * call doesn't need to hit Supabase except when the access token is
 * actually expired.
 */
export async function getUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
