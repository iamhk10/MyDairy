-- ΣTΣЯПITY — Supabase setup.  Run this ONCE:  Supabase dashboard → SQL Editor → New query → paste → Run.
-- (Safe to run again.)

-- 1) The library: one row per title. `data` holds the whole item as JSON.
create table if not exists public.library (
  id         text primary key,
  data       jsonb       not null,
  updated_at timestamptz not null default now()
);

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists library_touch on public.library;
create trigger library_touch before update on public.library
  for each row execute function public.touch_updated_at();

-- 2) Who is the owner? A table with exactly the owner's user id(s). Nobody can read or edit it from the website.
create table if not exists public.app_owner (
  uid uuid primary key references auth.users (id) on delete cascade
);
alter table public.app_owner enable row level security;      -- no policies = invisible to the API

create or replace function public.is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.app_owner where uid = auth.uid());
$$;
grant execute on function public.is_owner() to anon, authenticated;

-- 3) Row Level Security: EVERYONE may read, ONLY the owner may add / change / delete.
alter table public.library enable row level security;

drop policy if exists "library read"   on public.library;
drop policy if exists "library insert" on public.library;
drop policy if exists "library update" on public.library;
drop policy if exists "library delete" on public.library;

create policy "library read"   on public.library for select using (true);
create policy "library insert" on public.library for insert to authenticated with check (public.is_owner());
create policy "library update" on public.library for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "library delete" on public.library for delete to authenticated using (public.is_owner());

grant select on public.library to anon, authenticated;
grant insert, update, delete on public.library to authenticated;

-- 4) AFTER you create your owner user (Authentication → Users → Add user → Create new user, tick "Auto Confirm"),
--    run this line ONCE with YOUR e-mail. It makes that account the owner:
--
--    insert into public.app_owner (uid) select id from auth.users where email = 'YOUR@EMAIL.COM' on conflict do nothing;
