import type { ReactNode } from "react";

import { requireAdmin } from "@/lib/auth/requireUser";

/**
 * Server-side admin guard for every /admin/* route. requireAdmin redirects:
 *   - to /login if the user isn't signed in
 *   - to / if signed in but role !== 'admin'
 */
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAdmin("/admin");
  return <>{children}</>;
}
