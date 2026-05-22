/**
 * Photo re-hosting onto Supabase Storage.
 *
 * Telegram CDN URLs (cdn1-5.telesco.pe) are signed and expire — they
 * return 404 hours to days after being scraped. Hot-linking them
 * means every listing's photos break within days of ingestion.
 *
 * This module bridges that gap: at ingest time we download the
 * (still-valid) Telegram bytes and re-host them on Supabase Storage
 * under our project's bucket. The URLs we store in
 * `listings.mediaUrls` point to Supabase — permanent, on our own
 * CDN, served at the speed of any other static asset on the app.
 *
 * Disabled when SUPABASE_SERVICE_ROLE_KEY is missing — the pipeline
 * falls back to legacy hot-link mode so the system stays usable
 * while env is being configured. Photos break as before, but at
 * least extraction + listings still work.
 */
import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";

const BUCKET = "listing-photos";
const FETCH_TIMEOUT_MS = 15_000;

// Module-singleton admin client. Service-role key authorises writes
// to any bucket regardless of RLS. We only construct it lazily so the
// rest of the app can boot without the env var set.
let cachedClient: SupabaseClient | null = null;

async function getAdminClient(): Promise<SupabaseClient | null> {
  if (cachedClient) return cachedClient;
  if (!env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const { createClient } = await import("@supabase/supabase-js");
  cachedClient = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return cachedClient;
}

export type RehostResult =
  | { ok: true; url: string; cached: boolean }
  | { ok: false; error: string };

/**
 * Download a single Telegram CDN photo, upload to Supabase Storage,
 * return the public URL. Idempotent — if the target path already
 * exists, we skip the download.
 */
export async function rehostPhoto(opts: {
  sourceUrl: string;
  channelUsername: string;
  messageId: number;
  index: number;
}): Promise<RehostResult> {
  const client = await getAdminClient();
  if (!client) {
    return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY not configured" };
  }

  const filename = `${opts.messageId}-${opts.index}.jpg`;
  const path = `${opts.channelUsername}/${filename}`;

  // Cheap existence check: list the channel folder with a search
  // prefix narrow enough to return only the matching file. Skips a
  // download + upload when re-ingesting the same channel.
  const { data: existing, error: listError } = await client.storage
    .from(BUCKET)
    .list(opts.channelUsername, { search: filename });
  if (!listError && existing && existing.length > 0) {
    return {
      ok: true,
      url: client.storage.from(BUCKET).getPublicUrl(path).data.publicUrl,
      cached: true,
    };
  }

  // Download with a hard timeout — Telegram CDN occasionally hangs
  // on expired URLs instead of returning 404.
  let bytes: ArrayBuffer;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(opts.sourceUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));
    if (!res.ok) {
      return { ok: false, error: `download HTTP ${res.status}` };
    }
    bytes = await res.arrayBuffer();
    if (bytes.byteLength === 0) {
      return { ok: false, error: "download empty body" };
    }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "download failed",
    };
  }

  const { error: uploadError } = await client.storage
    .from(BUCKET)
    .upload(path, bytes, {
      contentType: "image/jpeg",
      upsert: true,
      cacheControl: "public, max-age=31536000, immutable",
    });
  if (uploadError) {
    return { ok: false, error: `upload: ${uploadError.message}` };
  }

  return {
    ok: true,
    url: client.storage.from(BUCKET).getPublicUrl(path).data.publicUrl,
    cached: false,
  };
}

/**
 * Bulk variant. Downloads N photos for the same post in parallel,
 * returns the resulting permanent URLs in the same order.
 *
 * Failed slots are DROPPED from the result rather than padded with
 * nulls — the listing ends up with the photos that did succeed,
 * which renders fine in the gallery. (Padding with nulls would
 * leave dead thumbnails in the strip.)
 *
 * When SUPABASE_SERVICE_ROLE_KEY is unset, returns sourceUrls
 * unchanged so the pipeline keeps working in legacy hot-link mode.
 */
export async function rehostPhotos(opts: {
  sourceUrls: string[];
  channelUsername: string;
  messageId: number;
}): Promise<{
  urls: string[];
  rehostedCount: number;
  cachedCount: number;
  failedCount: number;
}> {
  if (opts.sourceUrls.length === 0) {
    return { urls: [], rehostedCount: 0, cachedCount: 0, failedCount: 0 };
  }
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      urls: opts.sourceUrls,
      rehostedCount: 0,
      cachedCount: 0,
      failedCount: 0,
    };
  }

  const results = await Promise.all(
    opts.sourceUrls.map((url, i) =>
      rehostPhoto({
        sourceUrl: url,
        channelUsername: opts.channelUsername,
        messageId: opts.messageId,
        index: i,
      }),
    ),
  );

  const urls: string[] = [];
  let rehostedCount = 0;
  let cachedCount = 0;
  let failedCount = 0;
  for (const r of results) {
    if (r.ok) {
      urls.push(r.url);
      if (r.cached) cachedCount += 1;
      else rehostedCount += 1;
    } else {
      failedCount += 1;
    }
  }
  return { urls, rehostedCount, cachedCount, failedCount };
}
