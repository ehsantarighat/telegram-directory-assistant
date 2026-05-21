import Link from "next/link";

import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  href?: string;
  variant?: "default" | "compact";
};

export function BrandMark({ className, href = "/", variant = "default" }: Props) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 font-semibold tracking-tight",
        className,
      )}
      aria-label="Telegram Directory Assistant — home"
    >
      <span
        aria-hidden
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm"
      >
        <span className="text-sm font-bold">TDA</span>
      </span>
      {variant === "default" && (
        // The subtitle is hidden below sm (~640px) so the brand block
        // doesn't fight the nav + user-menu for horizontal space on
        // phones. Wordmark stays visible everywhere; subtitle returns
        // on tablets and up.
        <span className="flex flex-col leading-none min-w-0">
          <span className="text-sm font-semibold whitespace-nowrap">
            Telegram Directory
          </span>
          <span className="hidden sm:inline text-[10px] uppercase tracking-[0.18em] text-muted-foreground whitespace-nowrap">
            Uzbekistan · Real Estate
          </span>
        </span>
      )}
    </Link>
  );
}
