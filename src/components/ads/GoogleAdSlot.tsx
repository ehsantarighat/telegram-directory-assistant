"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

type Props = {
  /**
   * AdSense publisher id, format "ca-pub-XXXXXXXXXXXXXXXX". Get
   * it from your AdSense account → Account → Account information →
   * Publisher ID. When unset/empty the component renders null.
   */
  adClient: string | undefined | null;
  /**
   * Per-block slot id, format "1234567890". From AdSense →
   * Ads → By ad unit → "Get code" → look for `data-ad-slot`.
   */
  adSlot: string | undefined | null;
  /** Optional outer-wrapper class for margins, etc. */
  className?: string;
  /** Reserved minimum height in px to prevent CLS. */
  minHeight?: number;
};

/**
 * Google AdSense slot.
 *
 * Mirror of YandexAdSlot, same patterns:
 *   1. Renders an <ins class="adsbygoogle"> element with the
 *      AdSense data-* attributes. Reserved min-height to prevent
 *      CLS while ad loads.
 *   2. Loads the global adsbygoogle.js exactly once across the page
 *      via Next.js Script with id="google-adsbygoogle-script" and
 *      strategy="lazyOnload". Multiple slots share one fetch.
 *   3. Lazy-renders via IntersectionObserver — pushes into
 *      window.adsbygoogle only when the slot enters the viewport
 *      (200px rootMargin). Saves ad impressions for users who
 *      never scroll there.
 *   4. The "Ad" attribution is implicit in AdSense's own block
 *      chrome (Google adds it automatically). We add a small
 *      label above for symmetry with the Yandex slot.
 *
 * Returns null when adClient OR adSlot is missing — lets the
 * page wiring stay in place before AdSense approval lands.
 */
export function GoogleAdSlot({
  adClient,
  adSlot,
  className,
  minHeight = 280,
}: Props) {
  const containerRef = useRef<HTMLModElement | null>(null);
  const [visible, setVisible] = useState(false);
  // Ref guard so we don't push twice into adsbygoogle for the same
  // slot mount. useRef avoids the react-hooks/set-state-in-effect
  // lint and skips an unnecessary re-render.
  const pushedRef = useRef(false);

  // Defer first push until the slot is near the viewport.
  useEffect(() => {
    if (!adClient || !adSlot || pushedRef.current) return;
    if (typeof window === "undefined") return;
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
  }, [adClient, adSlot]);

  // When visible AND adsbygoogle is on the page, push the unit.
  // The push call tells AdSense to fill any unfilled <ins> on the
  // page; we mark it pushed locally to avoid double-pushing the
  // same slot if React effect fires twice in dev (StrictMode).
  useEffect(() => {
    if (!adClient || !adSlot || !visible || pushedRef.current) return;
    if (typeof window === "undefined") return;
    pushedRef.current = true;
    try {
      const w = window as unknown as {
        adsbygoogle?: Array<Record<string, unknown>>;
      };
      w.adsbygoogle = w.adsbygoogle || [];
      w.adsbygoogle.push({});
    } catch (err) {
      // AdSense throws "TagError: All 'ins' elements must already
      // have a data-ad-slot attribute when push is called" if our
      // <ins> markup is missing the attrs. Treat as non-fatal so a
      // single misconfigured slot doesn't crash the React tree.
      console.warn("[ads/google] push failed:", err);
    }
  }, [adClient, adSlot, visible]);

  if (!adClient || !adSlot) return null;

  return (
    <aside className={className} aria-label="Advertisement">
      <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        Ad
      </p>
      <ins
        ref={containerRef}
        className="adsbygoogle block w-full overflow-hidden rounded-lg bg-muted/30"
        style={{
          display: "block",
          minHeight,
        }}
        data-ad-client={adClient}
        data-ad-slot={adSlot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
      <Script
        id="google-adsbygoogle-script"
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adClient}`}
        strategy="lazyOnload"
        crossOrigin="anonymous"
        async
      />
    </aside>
  );
}
