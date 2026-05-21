/**
 * Relative date formatter via Intl.RelativeTimeFormat.
 *
 *   formatRelative(new Date(Date.now() - 60_000))    → "1 minute ago"
 *   formatRelative(new Date(Date.now() - 86400_000)) → "yesterday"
 *
 * Falls back to a localized short date for items older than `absoluteAfterDays`
 * (default 30) so the UI doesn't claim "2 months ago" forever.
 */
const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["second", 1],
  ["minute", 60],
  ["hour", 3600],
  ["day", 86400],
];

export function formatRelative(
  input: Date | string | null | undefined,
  options: { locale?: string; now?: Date; absoluteAfterDays?: number } = {},
): string {
  if (!input) return "";
  const date = input instanceof Date ? input : new Date(input);
  if (!Number.isFinite(date.getTime())) return "";

  const locale = options.locale ?? "en-US";
  const now = options.now ?? new Date();
  const absoluteAfterDays = options.absoluteAfterDays ?? 30;

  const diffSeconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const absDays = Math.abs(diffSeconds) / 86400;

  if (absDays > absoluteAfterDays) {
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  }

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  for (let i = UNITS.length - 1; i >= 0; i--) {
    const [unit, secondsInUnit] = UNITS[i];
    if (Math.abs(diffSeconds) >= secondsInUnit || i === 0) {
      return rtf.format(Math.round(diffSeconds / secondsInUnit), unit);
    }
  }
  return "";
}
