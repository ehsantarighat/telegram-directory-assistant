-- Phase 5: ensure every auth.users row gets a matching user_profiles row.
--
-- Supabase owns the `auth` schema, so we attach a trigger that fires
-- AFTER INSERT on auth.users and creates the corresponding profile row
-- with the same id. Default role/plan/content_mode come from the column
-- defaults declared by Drizzle.
--
-- The function is SECURITY DEFINER so it can write to the public schema
-- regardless of the calling role (Supabase auth runs as supabase_auth_admin).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
