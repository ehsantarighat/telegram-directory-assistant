import type { ReactNode } from "react";

import { BrandMark } from "@/components/shell/BrandMark";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="px-4 py-4 md:px-8 md:py-6">
        <BrandMark />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-12">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
