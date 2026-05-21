import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description?: string;
  phase?: string;
  className?: string;
  children?: ReactNode;
};

/**
 * Container used by Phase 1 route placeholders so each route has a
 * coherent header + content slot. Replaced by real page content in later
 * phases.
 */
export function PageSection({
  title,
  description,
  phase,
  className,
  children,
}: Props) {
  return (
    <section
      className={cn("mx-auto max-w-3xl px-4 py-8 md:py-12", className)}
    >
      <header className="flex flex-col gap-2 pb-6">
        {phase && (
          <Badge variant="secondary" className="w-fit">
            {phase}
          </Badge>
        )}
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-muted-foreground md:text-base">
            {description}
          </p>
        )}
      </header>
      {children}
    </section>
  );
}
