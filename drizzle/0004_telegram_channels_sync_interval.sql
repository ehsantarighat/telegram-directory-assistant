-- Per-channel auto-sync cadence.
--
-- The cron tick (Railway cron service running `pnpm sync:due`) picks
-- channels where now() >= last_synced_at + sync_interval_minutes (or
-- last_synced_at is null). Defaults to 60 min. Admins can override per
-- channel via the admin edit form. Set to 0 to disable auto-sync for
-- a specific channel (manual Run sync still works).
--
-- Backfill: every existing row gets the default 60 min. No data loss.
alter table public.telegram_channels
  add column if not exists sync_interval_minutes integer not null default 60;

-- A partial index over channels eligible for auto-sync. The cron query
-- filters by status='active' and sync_interval_minutes > 0, so an index
-- on (status, last_synced_at) where sync_interval_minutes > 0 makes the
-- due-query cheap even at thousands of channels.
create index if not exists telegram_channels_due_idx
  on public.telegram_channels (status, last_synced_at)
  where sync_interval_minutes > 0;
