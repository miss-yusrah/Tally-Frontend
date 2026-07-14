-- Tally — Notifications table (run once in Supabase SQL editor)
-- Safe to re-run.
-- Mirrors Dynamo NOTIFICATION#userId#createdAt#id + GSI(userId, createdAt desc).

create table if not exists public.notifications (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  type               text not null
    check (type in ('member_joined', 'expense_logged', 'settlement_confirmed')),
  trip_id            uuid not null references public.trips (id) on delete cascade,
  trip_name          text not null,
  actor_id           uuid not null references auth.users (id) on delete cascade,
  actor_name         text not null,
  actor_avatar_url   text,
  payload            jsonb not null default '{}'::jsonb,
  read               boolean not null default false,
  created_at         timestamptz not null default now()
);

create index if not exists notifications_user_id_created_at_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_user_id_unread_idx
  on public.notifications (user_id)
  where read = false;

alter table public.notifications enable row level security;

-- Recipients can read their own feed
drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications
  for select using (auth.uid() = user_id);

-- Trip members can emit alerts for fellow members (actor must be the signed-in user)
drop policy if exists "notifications_insert_actor" on public.notifications;
create policy "notifications_insert_actor" on public.notifications
  for insert with check (
    auth.uid() = actor_id
    and public.is_trip_member(trip_id, auth.uid())
    and public.is_trip_member(trip_id, user_id)
  );

-- Recipients can mark their own notifications read
drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
