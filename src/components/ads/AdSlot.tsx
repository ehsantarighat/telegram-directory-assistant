"use client";

import { GoogleAdSlot } from "./GoogleAdSlot";
import { YandexAdSlot } from "./YandexAdSlot";

type Props = {
  /**
   * Logical slot name. The component reads the matching env vars from
   * the inlined NEXT_PUBLIC_* values and renders whichever network is
   * configured for this position.
   *   - "feed"   → bottom of /listings
   *   - "detail" → aside on /listings/[id]
   */
  slot: "feed" | "detail";
  /** Optional wrapper class for margins, etc. */
  className?: string;
  /** Reserved minimum height in px to prevent CLS. */
  minHeight?: number;
};

/**
 * Picker between Yandex.Direct (РСЯ) and Google AdSense.
 *
 * Strategy: prefer Yandex when configured, fall back to Google.
 * Rationale: this app targets Uzbekistan, where Yandex search share
 * and CPMs typically beat Google's. When you have only one network
 * approved, just set its env vars and we render that one. When both
 * are wired, Yandex wins per slot (we never render both — that would
 * double the layout cost and confuse users).
 *
 * Why read process.env directly: NEXT_PUBLIC_* vars are inlined at
 * build time by Next.js. Reading them here means the bundle ships
 * just the relevant child component (the other is tree-shaken away
 * if its env is unset). It also keeps this picker pure — no hook,
 * no SSR/CSR mismatch risk.
 *
 * Returns null when nothing is configured. Page wiring can stay in
 * place before either ad network is approved.
 */
export function AdSlot({ slot, className, minHeight }: Props) {
  const yandexBlockId =
    slot === "feed"
      ? process.env.NEXT_PUBLIC_YANDEX_AD_FEED_BLOCK_ID
      : process.env.NEXT_PUBLIC_YANDEX_AD_DETAIL_BLOCK_ID;

  if (yandexBlockId && yandexBlockId.length > 0) {
    return (
      <YandexAdSlot
        blockId={yandexBlockId}
        className={className}
        minHeight={minHeight}
      />
    );
  }

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT_ID;
  const googleSlotId =
    slot === "feed"
      ? process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_FEED_SLOT
      : process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_DETAIL_SLOT;

  if (
    googleClientId &&
    googleClientId.length > 0 &&
    googleSlotId &&
    googleSlotId.length > 0
  ) {
    return (
      <GoogleAdSlot
        adClient={googleClientId}
        adSlot={googleSlotId}
        className={className}
        minHeight={minHeight}
      />
    );
  }

  return null;
}
