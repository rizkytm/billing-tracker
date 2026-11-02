-- Jalankan di Supabase Dashboard > SQL Editor (atau supabase db push)
-- Tabel langganan push notification (Web Push).
-- Jadwal cron harian ada di migration 20261102000001_schedule_notify_cron.sql

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  last_sent_date date, -- dedup: kirim maksimal 1x/hari per langganan
  created_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

drop policy if exists "push_select_own" on push_subscriptions;
drop policy if exists "push_insert_own" on push_subscriptions;
drop policy if exists "push_update_own" on push_subscriptions;
drop policy if exists "push_delete_own" on push_subscriptions;
create policy "push_select_own" on push_subscriptions for select using (auth.uid() = user_id);
create policy "push_insert_own" on push_subscriptions for insert with check (auth.uid() = user_id);
create policy "push_update_own" on push_subscriptions for update using (auth.uid() = user_id);
create policy "push_delete_own" on push_subscriptions for delete using (auth.uid() = user_id);
