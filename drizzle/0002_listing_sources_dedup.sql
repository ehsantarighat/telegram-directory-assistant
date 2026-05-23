-- Tighten listing_sources to disallow multiple rows per raw_telegram_post.
--
-- The original unique was (listing_id, raw_telegram_post_id), which
-- permitted N rows for one raw_post (one per matched listing). On
-- re-syncs the LLM extractor produces slightly different field values
-- → signature dedup matches a different existing listing → another
-- listing_sources row is inserted for the same raw_post. Over N
-- syncs, count(distinct listing_id) per channel exceeds count of
-- raw_posts per channel, which is mathematically nonsensical.
--
-- Cleanup + index swap, in order:
--   1. Drop duplicate listing_sources rows, keeping the earliest
--      row per raw_post (the original true attribution).
--   2. Drop the old unique index.
--   3. Create the new, stricter unique index.
--
-- Listings themselves are NOT touched. A listing whose duplicate-source
-- rows get pruned still has its other (genuine) sources or its primary
-- raw_post. Nothing becomes orphaned.

begin;

-- 1. Delete duplicate listing_sources rows, keeping the earliest per raw_post.
delete from public.listing_sources ls
where ls.id in (
  select id from (
    select
      id,
      row_number() over (
        partition by raw_telegram_post_id
        order by created_at asc, id asc
      ) as rn
    from public.listing_sources
  ) ranked
  where ranked.rn > 1
);

-- 2. Drop the old unique index.
drop index if exists public.listing_sources_listing_raw_unique;

-- 3. Create the new stricter unique index.
create unique index if not exists listing_sources_raw_post_unique
  on public.listing_sources (raw_telegram_post_id);

commit;
