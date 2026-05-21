import type { NextRequest } from "next/server";
import { updateSupabaseSession } from "@/lib/supabase/middleware";

/**
 * Next.js 16 Proxy entry point (was `middleware.ts` in <=15).
 *
 * Runs on every matched request before the route renders. We use it to
 * refresh the Supabase auth session cookie so server components and route
 * handlers always see a fresh user. No gating/redirects here yet — that
 * lands with the protected pages in Phase 3.
 */
export async function proxy(request: NextRequest) {
  return updateSupabaseSession(request);
}

export const config = {
  matcher: [
    // Skip Next internals, static assets, and the public folder.
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/|images/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
