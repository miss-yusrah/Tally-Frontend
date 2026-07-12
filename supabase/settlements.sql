-- Tally — Settlements table (run once in Supabase SQL editor)
-- Safe to re-run.

create table if not exists public.settlements (
  id                   uuid primary key default gen_random_uuid(),
  trip_id              uuid not null references public.trips (id) on delete cascade,
  from_user_id         uuid not null references auth.users (id) on delete cascade,
  to_user_id           uuid not null references auth.users (id) on delete cascade,
  amount_minor_units   bigint not null check (amount_minor_units > 0),
  currency             text not null,
  confirmed_by         uuid not null references auth.users (id) on delete cascade,
  idempotency_token    uuid not null,
  status               text not null default 'confirmed'
    check (status = 'confirmed'),
  settled_at           timestamptz not null default now(),
  constraint settlements_idempotency_token_unique unique (idempotency_token),
  constraint settlements_payer_confirms check (confirmed_by = from_user_id)
);

create index if not exists settlements_trip_id_settled_at_idx
  on public.settlements (trip_id, settled_at desc);

alter table public.settlements enable row level security;

drop policy if exists "settlements_select_members" on public.settlements;
create policy "settlements_select_members" on public.settlements
  for select using (public.is_trip_member(trip_id, auth.uid()));

drop policy if exists "settlements_insert_payer" on public.settlements;
create policy "settlements_insert_payer" on public.settlements
  for insert with check (
    public.is_trip_member(trip_id, auth.uid())
    and confirmed_by = auth.uid()
    and from_user_id = auth.uid()
  );
