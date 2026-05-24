"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

type Props = {
  /**
   * Yandex.Direct (РСЯ) block id, looks like "R-A-12345678-1".
   * Get it from partner.yandex.ru → Settings → RTB blocks → Code.
   * When unset/empty the component renders null — letting you
   * deploy the wiring before the Yandex account is approved.
   */
  blockId: string | undefined | null;
  /**
   * Optional CSS class on the outer wrapper (margins, etc.).
   */
  className?: string;
  /**
   * Reserved minimum height in pixels. Prevents layout shift when
   * the ad loads in. Pick something close to the ad block's
   * typical rendered height. 280 works for the standard responsive
   * "horizontal" / "vertical" / "in-content" units.
   */
  minHeight?: number;
};

/**
 * Yandex.Direct (РСЯ) ad slot.
 *
 * What it does:
 *   1. Renders a container div with a stable id `yandex_rtb_<blockId>`
 *      and `min-height` (CLS guard).
 *   2. Loads Yandex's global context.js exactly once across the page
 *      via `<Script id="yandex-context-script" strategy="lazyOnload">`.
 *      Next.js dedupes scripts with the same id, so multiple ad
 *      slots share one network request.
 *   3. Lazily requests the ad render only when the slot scrolls
 *      into view — IntersectionObserver with 50% margin. Saves
 *      money/bandwidth for users who never scroll to ads.
 *   4. Renders the "Реклама" label above the slot (required by
 *      Yandex's policy for partner sites).
 *
 * What it doesn't do:
 *   - Track anything itself. Yandex's own script is responsible
 *     for impression / click reporting after it mounts.
 *   - Render at all when blockId is missing — keeps the codebase
 *     ready for env config without breaking deploys.
 */
export function YandexAdSlot({
  blockId,
  className,
  minHeight = 280,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  // `rendered` doesn't drive any visual difference, just guards
  // against double-push into Yandex's queue. useRef avoids the
  // react-hooks/set-state-in-effect lint and skips a re-render.
  const renderedRef = useRef(false);

  // Defer ad render until the slot scrolls into view (or near it).
  useEffect(() => {
    if (!blockId || renderedRef.current || typeof window === "undefined") {
      return;
    }
    const node = containerRef.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            obs.disconnect();
            break;
          }
        }
      },
      { rootMargin: "200px 0px" },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [blockId]);

  // When visible AND context.js is loaded, push the render call into
  // Yandex's queue. The queue (`yaContextCb`) is created by the script
  // tag below; we don't need to wait for the script to finish — we
  // just push and Yandex's loader picks it up whenever it's ready.
  useEffect(() => {
    if (!blockId || !visible || renderedRef.current) return;
    if (typeof window === "undefined") return;
    renderedRef.current = true;
    type YaContextEntry = () => void;
    const w = window as unknown as { yaContextCb?: YaContextEntry[] };
    w.yaContextCb = w.yaContextCb || [];
    w.yaContextCb.push(() => {
      const ya = (window as unknown as {
        Ya?: { Context?: { AdvManager?: { render: (cfg: unknown) => void } } };
      }).Ya;
      ya?.Context?.AdvManager?.render({
        blockId,
        renderTo: `yandex_rtb_${blockId}`,
      });
    });
  }, [blockId, visible]);

  if (!blockId) return null;

  return (
    <aside
      className={className}
      aria-label="Advertisement"
    >
      {/* Required attribution per Yandex partner agreement. Tiny so
          it doesn't dominate the layout. */}
      <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        Реклама · Ad
      </p>
      <div
        ref={containerRef}
        id={`yandex_rtb_${blockId}`}
        style={{ minHeight }}
        className="w-full overflow-hidden rounded-lg bg-muted/30"
      />
      {/* Global Yandex loader. id= dedups across all slots on the
          page. lazyOnload defers until after first paint. */}
      <Script
        id="yandex-context-script"
        src="https://yandex.ru/ads/system/context.js"
        strategy="lazyOnload"
        async
      />
    </aside>
  );
}
