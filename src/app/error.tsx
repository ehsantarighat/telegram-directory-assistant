"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/states/ErrorState";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error boundary:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <ErrorState
        title="We hit a snag"
        description={
          process.env.NODE_ENV === "development"
            ? error.message
            : "Please try again. If the issue persists, refresh the page."
        }
        action={
          <Button onClick={reset} variant="secondary">
            Try again
          </Button>
        }
      />
    </div>
  );
}
