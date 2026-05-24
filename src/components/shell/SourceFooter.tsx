import Link from "next/link";
import { ShieldCheckIcon } from "lucide-react";

/**
 * Persistent transparency line shown above the mobile bottom nav.
 *
 * Master spec (Phase 12 quality goals): "The user should understand that
 * listings come from Telegram channels." This footer makes the data
 * origin obvious without being intrusive — small, ambient, with a link
 * to the listings feed so users can browse channels in one tap.
 */
export function SourceFooter() {
  return (
    <footer className="border-t border-border bg-muted/30 px-4 py-3 text-[11px] text-muted-foreground md:px-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-1 text-center md:flex-row md:justify-between md:gap-3 md:text-left">
        <p className="inline-flex items-center gap-1.5">
          <ShieldCheckIcon className="h-3 w-3" aria-hidden />
          We index public Telegram posts — every listing links back to
          its original source.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <Link href="/listings" className="hover:text-foreground">
            Browse listings
          </Link>
          <Link href="/suggest-channel" className="hover:text-foreground">
            Suggest a channel
          </Link>
          <Link href="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            Terms
          </Link>
        </div>
      </div>
    </footer>
  );
}
