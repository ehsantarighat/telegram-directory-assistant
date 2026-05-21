import Link from "next/link";
import { SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BrandMark } from "./BrandMark";
import { DesktopNav } from "./DesktopNav";
import { UserMenu } from "./UserMenu";

/**
 * App-wide top bar. Compact on mobile (brand + search shortcut), full
 * navigation on desktop (brand + primary nav + secondary CTA).
 */
export function TopBar() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <BrandMark />
        <div className="ml-auto flex items-center gap-2">
          <DesktopNav />
          <Button
            render={<Link href="/listings" />}
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Search listings"
          >
            <SearchIcon className="h-5 w-5" aria-hidden />
          </Button>
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
