-- Tally — AI Receipt Scan support (run once in Supabase SQL editor)
-- Safe to re-run.

-- Receipt attachment URL on expenses
alter table public.expenses
  add column if not exists receipt_image_url text;

-- Public bucket for receipt photos
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', true)
on conflict (id) do nothing;

drop policy if exists "receipts_insert_authenticated" on storage.objects;
create policy "receipts_insert_authenticated" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'receipts');

drop policy if exists "receipts_read_public" on storage.objects;
create policy "receipts_read_public" on storage.objects
  for select using (bucket_id = 'receipts');
