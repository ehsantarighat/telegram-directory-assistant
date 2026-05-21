/**
 * Public Telegram channel scraper.
 *
 * Strategy: every public Telegram channel has a server-side-rendered
 * preview at `https://t.me/s/<username>` that lists the last ~20 posts
 * as HTML, with `?before=<message_id>` returning the previous page.
 * No auth, no Bot API, no MTProto — works for any channel marked
 * "public" in Telegram. This trades some fragility (HTML scraping)
 * for huge operational simplicity. If the markup ever changes, only
 * this file needs to follow.
 *
 * What we extract per message:
 *   - message id, post URL, posted-at
 *   - text (with line breaks preserved)
 *   - photo URLs (full-size CDN URLs from telesco.pe)
 *   - video URL if present
 *
 * Albums (a sequence of message ids that Telegram displays as one
 * grouped post) collapse into a SINGLE `tgme_widget_message_wrap`
 * block — so we naturally end up with one logical message that has
 * multiple photos. Exactly what we want.
 *
 * Backfill: callers pass `maxPosts` (default 100) and `since` (default
 * 6 months ago). We walk pages backwards via `?before=` until either
 * limit hits.
 *
 * Re-usability: implements the same IngestionSource contract as the
 * mock source, so the pipeline + admin "Run sync" button work without
 * changes.
 */
import type { IngestionRawMessage, IngestionSource } from "./types";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

const DEFAULT_MAX_POSTS = 100;
const DEFAULT_MAX_AGE_DAYS = 183; // ~6 months

export type TelegramWebSourceOptions = {
  /** Max posts to return per call. Default 100. */
  maxPosts?: number;
  /** Don't return posts older than this many days. Default 183 (~6mo). */
  maxAgeDays?: number;
  /** Optional fetch override (tests). */
  fetcher?: typeof fetch;
};

export class TelegramWebSource implements IngestionSource {
  readonly name = "telegram-web";

  constructor(private readonly opts: TelegramWebSourceOptions = {}) {}

  async fetchMessages(input: {
    channelUsername: string;
    since?: Date;
    limit?: number;
  }): Promise<IngestionRawMessage[]> {
    const maxPosts = input.limit ?? this.opts.maxPosts ?? DEFAULT_MAX_POSTS;
    const maxAgeDays = this.opts.maxAgeDays ?? DEFAULT_MAX_AGE_DAYS;
    const fetcher = this.opts.fetcher ?? fetch;

    // Pick the stricter of (caller-provided watermark, hard cutoff)
    const cutoff = computeCutoff(input.since, maxAgeDays);

    const collected: IngestionRawMessage[] = [];
    const seen = new Set<number>();
    let before: number | null = null;
    let pages = 0;
    const MAX_PAGES = 20; // safety against infinite paginating

    while (collected.length < maxPosts && pages < MAX_PAGES) {
      pages += 1;
      const url = `https://t.me/s/${input.channelUsername}${
        before ? `?before=${before}` : ""
      }`;

      let html: string;
      try {
        const res = await fetcher(url, {
          headers: {
            "User-Agent": USER_AGENT,
            "Accept-Language": "en,ru;q=0.9",
          },
          // We disable redirect-following so we can detect the case where
          // Telegram 302s from /s/<username> → /<username>. That redirect
          // means the channel exists but its admin hasn't enabled the
          // public web preview — we can't scrape it without MTProto.
          redirect: "manual",
        });
        if (res.status === 301 || res.status === 302 || res.status === 308) {
          throw new Error(
            `@${input.channelUsername} doesn't expose a public web preview. The channel admin must enable it in Telegram (Channel Info → Settings → Channel Type → ☑ "Show preview"), or wire up MTProto-based ingestion for private/preview-disabled channels.`,
          );
        }
        if (!res.ok) {
          // 404 means the channel doesn't exist. Anything else is transient.
          throw new Error(
            `Telegram returned HTTP ${res.status} for @${input.channelUsername}`,
          );
        }
        html = await res.text();
      } catch (err) {
        if (collected.length === 0) throw err;
        // We already have some posts; cut the run short rather than
        // dropping everything on a transient page failure.
        break;
      }

      const messages = parseChannelHtml(html, input.channelUsername);
      if (messages.length === 0) break; // no more history available

      let oldest = Number.POSITIVE_INFINITY;
      let stopDueToCutoff = false;
      for (const m of messages) {
        if (seen.has(m.externalId)) continue;
        seen.add(m.externalId);
        oldest = Math.min(oldest, m.externalId);

        if (m.postedAt < cutoff) {
          stopDueToCutoff = true;
          continue;
        }
        collected.push(m);
        if (collected.length >= maxPosts) break;
      }

      if (stopDueToCutoff) break;
      if (!Number.isFinite(oldest)) break;
      // Next page goes earlier than the oldest id we just saw
      before = oldest;
    }

    // Pipeline contract is oldest-first
    collected.sort((a, b) => a.postedAt.getTime() - b.postedAt.getTime());
    return collected;
  }
}

function computeCutoff(since: Date | undefined, maxAgeDays: number): Date {
  const hardCutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);
  if (!since) return hardCutoff;
  // Use the stricter (more recent) of the two
  return since > hardCutoff ? since : hardCutoff;
}

// ---------- HTML parser ----------

/**
 * Parse a t.me/s/<channel> HTML page into IngestionRawMessage[].
 * Order in the page is reverse-chronological (newest first); we
 * preserve order here and let the caller sort.
 */
export function parseChannelHtml(
  html: string,
  channelUsername: string,
): IngestionRawMessage[] {
  // Split on each message wrap. The split discards the leading boilerplate.
  const parts = html.split(/<div\s+class="tgme_widget_message_wrap[^"]*"/);
  const messages: IngestionRawMessage[] = [];

  for (let i = 1; i < parts.length; i++) {
    const block = parts[i];
    const post = matchAttr(block, "data-post");
    if (!post) continue;
    const [, idStr] = post.split("/");
    const externalId = parseInt(idStr ?? "", 10);
    if (!Number.isFinite(externalId)) continue;

    const datetime = matchTimeDatetime(block);
    if (!datetime) continue;

    const text = extractMessageText(block);
    const photoUrls = extractPhotoUrls(block);
    const videoUrl = extractVideoUrl(block);

    const mediaUrls: string[] = [...photoUrls];
    if (videoUrl) mediaUrls.push(videoUrl);

    messages.push({
      externalId,
      source: channelUsername,
      text,
      mediaUrls,
      postedAt: datetime,
      raw: {
        url: `https://t.me/${channelUsername}/${externalId}`,
        photos: photoUrls,
        video: videoUrl ?? null,
        scrapedAt: new Date().toISOString(),
      },
    });
  }

  return messages;
}

function matchAttr(block: string, attr: string): string | null {
  const m = new RegExp(`${attr}="([^"]+)"`).exec(block);
  return m ? m[1] : null;
}

function matchTimeDatetime(block: string): Date | null {
  const m = /<time[^>]+datetime="([^"]+)"/.exec(block);
  if (!m) return null;
  const d = new Date(m[1]);
  return Number.isNaN(d.getTime()) ? null : d;
}

function extractMessageText(block: string): string {
  // Telegram nests the text under `.tgme_widget_message_text`. There may
  // be more than one (forwarded message, reply preview); take the FIRST
  // top-level body match.
  const m = /<div class="tgme_widget_message_text js-message_text"[^>]*>([\s\S]*?)<\/div>\s*(?=<div|<\/div>|<a class="tgme|<\/div>$)/.exec(
    block,
  );
  if (!m) return "";
  const raw = m[1];
  // <br> → newline; strip remaining tags; decode entities.
  const cleaned = raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\r/g, "");
  return decodeHtmlEntities(cleaned).trim();
}

function extractPhotoUrls(block: string): string[] {
  // Two HTML shapes:
  //   1. Single photo:    style="background-image:url('https://cdn4.telesco.pe/...')"
  //   2. Grouped album:   multiple `background-image:url('...')` inside a grouped wrap
  // Both are reachable via the same regex.
  const re = /background-image:url\('(https:\/\/cdn\d+\.telesco\.pe\/[^']+)'\)/g;
  const urls: string[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) {
    if (!seen.has(m[1])) {
      seen.add(m[1]);
      urls.push(m[1]);
    }
  }
  return urls;
}

function extractVideoUrl(block: string): string | null {
  const m = /<video[^>]+src="(https:\/\/[^"]+)"/.exec(block);
  return m ? m[1] : null;
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&laquo;/g, "«")
    .replace(/&raquo;/g, "»")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&hellip;/g, "…")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
}
