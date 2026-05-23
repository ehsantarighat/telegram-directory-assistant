import {
  BookmarkIcon,
  EyeIcon,
  GitMergeIcon,
  LanguagesIcon,
  SparklesIcon,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { formatRelative } from "@/lib/format/date";
import type { ListingDetail } from "@/lib/listings/query";

/**
 * "Activity" card for the listing-detail aside. Vertical stat list
 * sourced entirely from existing listings columns — no extra DB
 * round-trip.
 *
 * Helps a visitor calibrate trust: "indexed today, 1 view" reads
 * very differently from "indexed 2 weeks ago, 200 views, 8 saves".
 */
const LANG_LABEL: Record<string, string> = {
  ru: "Russian",
  uz: "Uzbek",
  en: "English",
  fa: "Persian",
  ar: "Arabic",
};

type Props = {
  listing: ListingDetail;
};

export function ListingActivity({ listing }: Props) {
  const rows = [
    {
      icon: EyeIcon,
      label: `${listing.viewCount.toLocaleString()} ${
        listing.viewCount === 1 ? "view" : "views"
      }`,
    },
    {
      icon: BookmarkIcon,
      label: `${listing.savedCount.toLocaleString()} ${
        listing.savedCount === 1 ? "save" : "saves"
      }`,
    },
    {
      icon: GitMergeIcon,
      label: `Posted in ${listing.sourceCount} ${
        listing.sourceCount === 1 ? "channel" : "channels"
      }`,
    },
    {
      icon: SparklesIcon,
      label: `Indexed ${formatRelative(listing.importedAt)}`,
    },
    listing.publishedAt
      ? {
          icon: SparklesIcon,
          label: `Posted on Telegram ${formatRelative(listing.publishedAt)}`,
        }
      : null,
    listing.detectedLanguage
      ? {
          icon: LanguagesIcon,
          label: `Language: ${
            LANG_LABEL[listing.detectedLanguage] ?? listing.detectedLanguage
          }`,
        }
      : null,
  ].filter((r): r is NonNullable<typeof r> => r !== null);

  return (
    <Card className="p-4 md:p-5">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Activity
      </h3>
      <ul className="flex flex-col gap-2 text-sm">
        {rows.map((r) => {
          const Icon = r.icon;
          return (
            <li
              key={r.label}
              className="flex items-center gap-2 text-foreground"
            >
              <Icon
                className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <span className="min-w-0 break-words">{r.label}</span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
