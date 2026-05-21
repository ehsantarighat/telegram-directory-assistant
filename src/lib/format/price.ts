/**
 * Format a listing price + currency for display.
 *
 *   formatPrice("750", "USD")     → "$750"
 *   formatPrice("8000000", "UZS") → "8,000,000 UZS"
 *   formatPrice(null, "USD")      → "Price on request"
 */
export function formatPrice(
  price: string | number | null | undefined,
  currency: string | null | undefined,
  options: { locale?: string; suffix?: string } = {},
): string {
  if (price == null || price === "") return "Price on request";
  const n = typeof price === "number" ? price : parseFloat(price);
  if (!Number.isFinite(n)) return "Price on request";

  const locale = options.locale ?? "en-US";

  if (currency === "USD") {
    const formatted = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: n % 1 === 0 ? 0 : 2,
    }).format(n);
    return options.suffix ? `${formatted}${options.suffix}` : formatted;
  }

  if (currency === "UZS") {
    const formatted = new Intl.NumberFormat(locale, {
      maximumFractionDigits: 0,
    }).format(n);
    return options.suffix
      ? `${formatted} UZS${options.suffix}`
      : `${formatted} UZS`;
  }

  const formatted = new Intl.NumberFormat(locale).format(n);
  return currency
    ? `${formatted} ${currency}${options.suffix ?? ""}`
    : formatted + (options.suffix ?? "");
}

/**
 * Per-period suffix for listing types.
 *   rent       → "/mo"
 *   daily_rent → "/night"
 *   sale       → "" (one-time)
 */
export function priceSuffix(
  listingType: "rent" | "sale" | "daily_rent",
): string {
  switch (listingType) {
    case "rent":
      return "/mo";
    case "daily_rent":
      return "/night";
    case "sale":
    default:
      return "";
  }
}
