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
        <span className="flex flex-col leading-none">
          <span className="text-sm font-semibold">Telegram Directory</span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Uzbekistan · Real Estate
          </span>
        </span>
      )}
    </Link>
  );
}
