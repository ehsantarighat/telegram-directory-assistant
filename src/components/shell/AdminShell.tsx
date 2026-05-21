import type { ReactNode } from "react";
import { MenuIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { BrandMark } from "./BrandMark";
import { AdminSidebar } from "./AdminSidebar";

type Props = {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
};

/**
 * Admin layout. Desktop: persistent left sidebar.
 * Mobile: top bar with a hamburger that opens the sidebar in a Sheet.
 *
 * Role-gating is stubbed in Phase 1; real `requireAdmin()` lands in Phase 5
 * (Auth). For now we just render the shell so the layout is testable.
 */
export function AdminShell({ title, description, actions, children }: Props) {
  return (
    <div className="flex min-h-full">
      <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:border-border md:bg-muted/30">
        <div className="flex h-14 items-center border-b border-border px-4">
          <BrandMark />
        </div>
        <AdminSidebar className="flex-1" />
        <div className="border-t border-border px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground">
          Admin · role gate stubbed
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <Sheet>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  aria-label="Open admin menu"
                />
              }
            >
              <MenuIcon className="h-5 w-5" aria-hidden />
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="border-b border-border px-4 py-3">
                <SheetTitle>
                  <BrandMark />
                </SheetTitle>
              </SheetHeader>
              <AdminSidebar />
            </SheetContent>
          </Sheet>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-semibold">{title}</span>
            {description && (
              <span className="truncate text-xs text-muted-foreground">
                {description}
              </span>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2">{actions}</div>
          )}
        </header>
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
