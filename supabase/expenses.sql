-- Tally — Expenses table (run once in Supabase SQL editor)
-- Safe to re-run.

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
  -- Denormalized split array: [{ "userId": "...", "amountMinorUnits": 123 }]
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
