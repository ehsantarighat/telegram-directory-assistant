"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { PRIMARY_NAV } from "./nav.config";

/**
 * Sticky bottom-nav for mobile. Hidden at md and up. Sits above
 * iOS home-indicator via `pb-safe`.
 */
export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70"
      aria-label="Primary"
    >
      <ul
        className="mx-auto grid max-w-md grid-cols-5 px-1 pt-2"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.5rem)" }}
      >
        {PRIMARY_NAV.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-transform",
                    active && "scale-110",
                  )}
                  aria-hidden
                />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
