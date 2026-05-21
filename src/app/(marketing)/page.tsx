import Link from "next/link";
import {
  ArrowRightIcon,
  BookmarkIcon,
  Building2Icon,
  CalendarDays,
  HomeIcon,
  KeyIcon,
  SearchIcon,
  ShieldCheckIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = {
  title: "Discover Uzbekistan real estate",
};

const TYPE_CHIPS = [
  {
    href: "/listings?type=rent",
    label: "Rent",
    description: "Long-term apartments and houses.",
    icon: KeyIcon,
  },
  {
    href: "/listings?type=sale",
    label: "Sale",
    description: "Properties for purchase.",
    icon: HomeIcon,
  },
  {
    href: "/listings?type=daily",
    label: "Daily",
    description: "Short-term and nightly stays.",
    icon: CalendarDays,
  },
] as const;

const POPULAR_CITIES = [
  { slug: "tashkent", name: "Tashkent", caption: "Capital · most listings" },
  { slug: "samarkand", name: "Samarkand", caption: "Historic centre" },
  { slug: "bukhara", name: "Bukhara", caption: "Tourist-friendly" },
  { slug: "namangan", name: "Namangan", caption: "Fergana valley" },
] as const;

export default function HomePage() {
  return (
    <div className="flex flex-col gap-8 pb-4">
      {/* Hero */}
      <section className="relative isolate overflow-hidden border-b border-border bg-gradient-to-b from-primary/5 via-background to-background px-4 pb-10 pt-8 md:px-8 md:pb-16 md:pt-14">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 text-center">
          <Badge variant="secondary" className="gap-1.5">
            <ShieldCheckIcon className="h-3.5 w-3.5" aria-hidden />
            Sources publicly attributed
          </Badge>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight md:text-5xl">
            Find homes posted on{" "}
            <span className="bg-gradient-to-r from-primary via-sky-500 to-cyan-500 bg-clip-text text-transparent">
              Uzbekistan Telegram channels
            </span>{" "}
            — all in one search.
          </h1>
          <p className="max-w-xl text-balance text-sm text-muted-foreground md:text-base">
            Browse rent, sale, and daily rentals from real estate channels we
            ingest, dedupe, and structure. Every listing links back to the
            original Telegram post.
          </p>

          {/* Search affordance — non-functional in Phase 1, links to /listings */}
          <Link
            href="/listings"
            className="group flex w-full max-w-xl items-center gap-3 rounded-full border border-border bg-card px-5 py-3 text-left shadow-sm transition-shadow hover:shadow"
          >
            <SearchIcon
              className="h-5 w-5 text-muted-foreground"
              aria-hidden
            />
            <span className="flex flex-1 flex-col text-sm">
              <span className="font-medium">Search Tashkent, Samarkand…</span>
              <span className="text-xs text-muted-foreground">
                Filter by type, district, price, rooms
              </span>
            </span>
            <ArrowRightIcon
              className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>

          <div className="flex w-full max-w-xl flex-wrap items-center justify-center gap-2 pt-1">
            {TYPE_CHIPS.map((chip) => {
              const Icon = chip.icon;
              return (
                <Button
                  key={chip.href}
                  render={<Link href={chip.href} />}
                  variant="secondary"
                  size="sm"
                  className="rounded-full"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {chip.label}
                </Button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Type detail */}
      <section className="mx-auto w-full max-w-5xl px-4 md:px-8">
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Browse by type
          </h2>
        </header>
        <div className="grid gap-3 sm:grid-cols-3">
          {TYPE_CHIPS.map((chip) => {
            const Icon = chip.icon;
            return (
              <Card
                key={chip.href}
                className="group transition-shadow hover:shadow-md"
              >
                <Link href={chip.href} className="block">
                  <CardContent className="flex items-start gap-3 p-4">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="flex min-w-0 flex-col">
                      <span className="font-semibold">{chip.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {chip.description}
                      </span>
                    </div>
                    <ArrowRightIcon
                      className="ms-auto h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </CardContent>
                </Link>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Popular cities */}
      <section className="mx-auto w-full max-w-5xl px-4 md:px-8">
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Popular cities
          </h2>
          <Link
            href="/listings"
            className="text-xs font-medium text-primary hover:underline"
          >
            All listings
          </Link>
        </header>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {POPULAR_CITIES.map((city) => (
            <Card key={city.slug} className="group">
              <Link
                href={`/listings?citySlug=${city.slug}`}
                className="block"
              >
                <CardContent className="flex flex-col gap-1 p-4">
                  <div className="flex items-center gap-2">
                    <Building2Icon
                      className="h-4 w-4 text-muted-foreground"
                      aria-hidden
                    />
                    <span className="font-semibold">{city.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {city.caption}
                  </span>
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>
      </section>

      {/* Why this exists */}
      <section className="mx-auto w-full max-w-5xl px-4 pb-6 md:px-8 md:pb-12">
        <Card className="bg-muted/30">
          <CardContent className="grid gap-4 p-5 md:grid-cols-3 md:p-6">
            <Feature
              icon={SearchIcon}
              title="Faster search"
              body="Listings from many Telegram channels in one place — filter, sort, and save without scrolling forever."
            />
            <Feature
              icon={BookmarkIcon}
              title="Save what matters"
              body="Bookmark listings, set up alerts (coming in Phase 11), and revisit your shortlist anytime."
            />
            <Feature
              icon={ShieldCheckIcon}
              title="Always attributed"
              body="Every listing links back to its source Telegram post. We index public content, not own it."
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-background text-primary shadow-sm">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="text-xs text-muted-foreground">{body}</p>
    </div>
  );
}
