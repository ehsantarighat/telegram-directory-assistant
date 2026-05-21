"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeftIcon, ChevronRightIcon, ImageIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  images: string[];
  alt: string;
  className?: string;
};

/**
 * Mobile-first media gallery. Swipe/scroll-snap on touch devices,
 * arrow buttons + thumbnail strip on desktop. Empty state if no images.
 */
export function ListingMediaGallery({ images, alt, className }: Props) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div
        className={cn(
          "flex aspect-[4/3] w-full items-center justify-center rounded-xl bg-muted text-muted-foreground",
          className,
        )}
        aria-label="No photos available"
      >
        <div className="flex flex-col items-center gap-2 text-sm">
          <ImageIcon className="h-8 w-8" aria-hidden />
          <span>No photos provided</span>
        </div>
      </div>
    );
  }

  const next = () => setActive((i) => (i + 1) % images.length);
  const prev = () => setActive((i) => (i - 1 + images.length) % images.length);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted">
        <Image
          src={images[active]}
          alt={`${alt} — image ${active + 1}`}
          fill
          sizes="(max-width: 768px) 100vw, 60vw"
          className="object-cover transition-opacity"
          priority={active === 0}
        />
        {images.length > 1 && (
          <>
            <Button
              variant="secondary"
              size="icon-sm"
              onClick={prev}
              aria-label="Previous photo"
              className="absolute start-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 backdrop-blur shadow"
            >
              <ChevronLeftIcon className="h-4 w-4" aria-hidden />
            </Button>
            <Button
              variant="secondary"
              size="icon-sm"
              onClick={next}
              aria-label="Next photo"
              className="absolute end-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 backdrop-blur shadow"
            >
              <ChevronRightIcon className="h-4 w-4" aria-hidden />
            </Button>
            <div className="pointer-events-none absolute bottom-2 end-2 rounded-full bg-black/55 px-2 py-0.5 text-xs font-medium text-white">
              {active + 1} / {images.length}
            </div>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => setActive(i)}
              aria-current={i === active}
              aria-label={`Photo ${i + 1}`}
              className={cn(
                "relative h-14 w-20 shrink-0 overflow-hidden rounded-md border-2 transition-all",
                i === active
                  ? "border-primary"
                  : "border-transparent opacity-70 hover:opacity-100",
              )}
            >
              <Image
                src={src}
                alt=""
                fill
                sizes="80px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
