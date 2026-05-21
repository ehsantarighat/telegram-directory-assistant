import Link from "next/link";
import { ExternalLinkIcon, RadioIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { formatRelative } from "@/lib/format/date";
import type { ListingDetail } from "@/lib/listings/query";

type Props = {
  primary: ListingDetail["primarySource"];
  additional: ListingDetail["additionalSources"];
};

/**
 * Source-attribution panel. Shows the primary channel + Telegram post URL
 * and (if duplicates exist) all other channels where the same listing
 * appeared, each linked back to its t.me URL.
 */
export function ListingSourcesPanel({ primary, additional }: Props) {
  const total = (primary ? 1 : 0) + additional.length;

  return (
    <Card className="overflow-hidden p-0">
      <header className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold">
          Source channels
          <span className="ms-1 font-normal text-muted-foreground">
            · {total}
          </span>
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          We index publicly-posted listings. Every post links back to its
          original Telegram source.
        </p>
      </header>

      <ul className="divide-y divide-border">
        {primary && (
          <SourceRow
            channelTitle={primary.channelTitle}
            channelUsername={primary.channelUsername}
            channelUrl={primary.channelUrl}
            originalPostUrl={primary.originalPostUrl}
            publishedAt={primary.publishedAt}
            isPrimary
          />
        )}
        {additional.map((s) => (
          <SourceRow
            key={s.originalPostUrl}
            channelTitle={s.channelTitle}
            channelUsername={s.channelUsername}
            channelUrl={s.channelUrl}
            originalPostUrl={s.originalPostUrl}
            publishedAt={s.publishedAt}
          />
        ))}
      </ul>
    </Card>
  );
}

function SourceRow({
  channelTitle,
  channelUsername,
  channelUrl,
  originalPostUrl,
  publishedAt,
  isPrimary,
}: {
  channelTitle: string;
  channelUsername: string;
  channelUrl: string;
  originalPostUrl: string;
  publishedAt: string;
  isPrimary?: boolean;
}) {
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <RadioIcon className="h-4 w-4" aria-hidden />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <Link
            href={channelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold hover:underline"
          >
            {channelTitle}
          </Link>
          {isPrimary && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Primary
            </span>
          )}
        </div>
        <Link
          href={channelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:underline"
        >
          @{channelUsername}
        </Link>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <Link
            href={originalPostUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            Open original post
            <ExternalLinkIcon className="h-3 w-3" aria-hidden />
          </Link>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">
            posted {formatRelative(publishedAt)}
          </span>
        </div>
      </div>
    </li>
  );
}
