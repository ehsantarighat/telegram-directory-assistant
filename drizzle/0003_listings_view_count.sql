-- Add view_count aggregate to listings.
--
-- Incremented on every visit to /listings/[id] (via Next.js `after()`
-- in the page so it doesn't block the response). Used to drive the
-- "Most viewed" sort option and surface popular listings to admins.
--
-- Index supports the ORDER BY view_count DESC query path used by
-- both the public feed's most_viewed sort and the admin dashboard.

alter table public.listings
  add column if not exists view_count bigint not null default 0;

create index if not exists listings_view_count_idx
  on public.listings (view_count desc)
  where status = 'active';
