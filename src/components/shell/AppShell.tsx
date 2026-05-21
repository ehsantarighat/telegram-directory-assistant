import type { ReactNode } from "react";

import { MobileNav } from "./MobileNav";
import { TopBar } from "./TopBar";

/**
 * Public/user-facing shell. Top bar always visible, bottom nav on mobile,
 * extra bottom padding so content doesn't hide behind the nav.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <TopBar />
      <main className="flex-1 pb-24 md:pb-12">{children}</main>
      <MobileNav />
    </div>
  );
}
