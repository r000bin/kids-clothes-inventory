-- Kids clothes inventory - database schema
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- It is safe to re-run.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- items
create table if not exists public.items (
  id          uuid primary key default gen_random_uuid(),
  category    text not null,
  size        text not null,
  quantity    integer not null default 1 check (quantity >= 0),
  location    text,
  notes       text,
  photo_path  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists items_size_idx     on public.items (size);
create index if not exists items_category_idx on public.items (category);

-- ------------------------------------------------------------- settings
-- Household-wide key/value settings, so both phones agree.
--   min_size:      smallest size still worn; anything below is "ready to pass on".
--   categories:    JSON array of category terms, editable and orderable in the app.
--   category_sort: how the picker sorts them ('custom' | 'alpha' | 'freq').
create table if not exists public.settings (
  key        text primary key,
  value      text,
  updated_at timestamptz not null default now()
);

insert into public.settings (key, value) values
  ('min_size', ''),
  ('categories', ''),
  ('category_sort', 'custom')
on conflict (key) do nothing;

-- -------------------------------------------------------- updated_at
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists items_touch on public.items;
create trigger items_touch before update on public.items
  for each row execute function public.touch_updated_at();

drop trigger if exists settings_touch on public.settings;
create trigger settings_touch before update on public.settings
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------------ RLS
-- Household model: the handful of accounts you create can all read and write
-- everything. Nobody signed out can see anything.
alter table public.items    enable row level security;
alter table public.settings enable row level security;

drop policy if exists "items read"   on public.items;
drop policy if exists "items insert" on public.items;
drop policy if exists "items update" on public.items;
drop policy if exists "items delete" on public.items;
create policy "items read"   on public.items for select to authenticated using (true);
create policy "items insert" on public.items for insert to authenticated with check (true);
create policy "items update" on public.items for update to authenticated using (true) with check (true);
create policy "items delete" on public.items for delete to authenticated using (true);

drop policy if exists "settings read"   on public.settings;
drop policy if exists "settings write"  on public.settings;
drop policy if exists "settings insert" on public.settings;
create policy "settings read"   on public.settings for select to authenticated using (true);
create policy "settings write"  on public.settings for update to authenticated using (true) with check (true);
create policy "settings insert" on public.settings for insert to authenticated with check (true);

-- ------------------------------------------------------------- realtime
-- Lets one phone see the other's changes without a refresh.
do $$
begin
  alter publication supabase_realtime add table public.items;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.settings;
exception when duplicate_object then null;
end $$;

-- -------------------------------------------------------------- photos
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

drop policy if exists "photos read"   on storage.objects;
drop policy if exists "photos insert" on storage.objects;
drop policy if exists "photos update" on storage.objects;
drop policy if exists "photos delete" on storage.objects;
create policy "photos read"   on storage.objects for select to authenticated using (bucket_id = 'photos');
create policy "photos insert" on storage.objects for insert to authenticated with check (bucket_id = 'photos');
create policy "photos update" on storage.objects for update to authenticated using (bucket_id = 'photos');
create policy "photos delete" on storage.objects for delete to authenticated using (bucket_id = 'photos');
