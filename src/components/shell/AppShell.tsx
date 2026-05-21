import type { ReactNode } from "react";

import { MobileNav } from "./MobileNav";
import { SourceFooter } from "./SourceFooter";
import { TopBar } from "./TopBar";

/**
 * Public/user-facing shell. Top bar always visible, transparency
 * footer above the mobile nav, bottom nav on mobile. The bottom
 * padding clears both the source footer and the mobile nav so content
 * never hides behind them.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <TopBar />
      <main className="flex-1 pb-32 md:pb-12">{children}</main>
      <SourceFooter />
      <MobileNav />
    </div>
  );
}
