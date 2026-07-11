-- Tally — Trips schema (run once in Supabase SQL editor)
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE where possible.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.trips (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  destination   text not null,
  start_date    date,
  end_date      date,
  base_currency text not null,
  organizer_id  uuid not null references auth.users (id) on delete cascade,
  invite_token  text not null unique,
  created_at    timestamptz not null default now()
);

create table if not exists public.trip_members (
  trip_id      uuid not null references public.trips (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  role         text not null check (role in ('organizer', 'member')),
  display_name text,
  avatar_url   text,
  joined_at    timestamptz not null default now(),
  primary key (trip_id, user_id)
);

-- Fast token -> trip resolution, and "trips for a user" lookups.
create index if not exists trips_invite_token_idx on public.trips (invite_token);
create index if not exists trip_members_user_idx on public.trip_members (user_id);

-- ---------------------------------------------------------------------------
-- Membership helper (SECURITY DEFINER avoids RLS recursion)
-- ---------------------------------------------------------------------------
create or replace function public.is_trip_member(p_trip_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.trip_members
    where trip_id = p_trip_id and user_id = p_user_id
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.trips enable row level security;
alter table public.trip_members enable row level security;

drop policy if exists "trips_select_members" on public.trips;
create policy "trips_select_members" on public.trips
  for select using (public.is_trip_member(id, auth.uid()));

drop policy if exists "trips_insert_organizer" on public.trips;
create policy "trips_insert_organizer" on public.trips
  for insert with check (organizer_id = auth.uid());

drop policy if exists "trip_members_select_same_trip" on public.trip_members;
create policy "trip_members_select_same_trip" on public.trip_members
  for select using (public.is_trip_member(trip_id, auth.uid()));

drop policy if exists "trip_members_insert_self" on public.trip_members;
create policy "trip_members_insert_self" on public.trip_members
  for insert with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Join-by-token RPC (used by the invite redemption flow)
-- SECURITY DEFINER so a non-member can resolve + join a trip via its token.
-- Returns SETOF for reliable PostgREST / supabase-js array responses.
-- ---------------------------------------------------------------------------
create or replace function public.lookup_trip_by_invite_token(p_token text)
returns setof public.trips
language sql
security definer
set search_path = public
as $$
  select *
  from public.trips
  where invite_token = p_token
  limit 1;
$$;

create or replace function public.join_trip_via_token(
  p_token        text,
  p_display_name text,
  p_avatar_url   text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip_id uuid;
begin
  select id into v_trip_id from public.trips where invite_token = p_token;
  if v_trip_id is null then
    raise exception 'INVALID_TOKEN';
  end if;

  insert into public.trip_members (trip_id, user_id, role, display_name, avatar_url)
  values (v_trip_id, auth.uid(), 'member', p_display_name, p_avatar_url)
  on conflict (trip_id, user_id) do nothing;

  return v_trip_id;
end;
$$;

-- Required for Supabase client RPC calls (anon + signed-in users).
grant execute on function public.is_trip_member(uuid, uuid) to anon, authenticated;
grant execute on function public.lookup_trip_by_invite_token(text) to anon, authenticated;
grant execute on function public.join_trip_via_token(text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Expenses (denormalized splits at creation time)
-- ---------------------------------------------------------------------------
create table if not exists public.expenses (
  id                     uuid primary key default gen_random_uuid(),
  trip_id                uuid not null references public.trips (id) on delete cascade,
  payer_id               uuid not null references auth.users (id) on delete cascade,
  created_by             uuid not null references auth.users (id) on delete cascade,
  amount_minor_units     bigint not null check (amount_minor_units > 0),
  currency               text not null,
  base_currency_amount   bigint not null check (base_currency_amount > 0),
  fx_rate                numeric not null default 1,
  fx_cached              boolean not null default false,
  category               text check (
    category is null or category in ('food', 'transport', 'lodging', 'activities', 'other')
  ),
  note                   text,
  merchant               text,
  split_method           text not null check (split_method in ('equal', 'custom')),
  split_map              jsonb not null default '[]'::jsonb,
  ocr_source             boolean not null default false,
  receipt_image_url      text,
  created_at             timestamptz not null default now()
);

create index if not exists expenses_trip_id_created_at_idx
  on public.expenses (trip_id, created_at desc);

alter table public.expenses enable row level security;

drop policy if exists "expenses_select_members" on public.expenses;
create policy "expenses_select_members" on public.expenses
  for select using (public.is_trip_member(trip_id, auth.uid()));

drop policy if exists "expenses_insert_members" on public.expenses;
create policy "expenses_insert_members" on public.expenses
  for insert with check (
    public.is_trip_member(trip_id, auth.uid())
    and created_by = auth.uid()
  );

drop policy if exists "expenses_update_members" on public.expenses;
create policy "expenses_update_members" on public.expenses
  for update using (public.is_trip_member(trip_id, auth.uid()));

drop policy if exists "expenses_delete_members" on public.expenses;
create policy "expenses_delete_members" on public.expenses
  for delete using (public.is_trip_member(trip_id, auth.uid()));
