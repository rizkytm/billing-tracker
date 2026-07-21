-- Jalankan script ini di Supabase Dashboard > SQL Editor
-- Bikin 3 tabel: bills (definisi tagihan), bill_payments (status per bulan),
-- monthly_balance (sisa uang yang kamu input per bulan)

create extension if not exists "pgcrypto";

create table if not exists bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  amount numeric not null check (amount >= 0),
  due_day int check (due_day between 1 and 31),
  is_recurring boolean not null default true,
  target_month text, -- format 'YYYY-MM', hanya dipakai kalau is_recurring = false
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists bill_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  bill_id uuid not null references bills(id) on delete cascade,
  month text not null, -- format 'YYYY-MM'
  amount numeric not null,
  is_paid boolean not null default false,
  paid_at timestamptz,
  is_active boolean not null default true, -- per-month skip flag (false = nonaktif bulan ini)
  created_at timestamptz not null default now(),
  unique (bill_id, month)
);

-- Migration untuk DB yang sudah ada:
-- ALTER TABLE bill_payments ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

create table if not exists monthly_balance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  month text not null,
  current_balance numeric not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, month)
);

-- Row Level Security: setiap user cuma bisa lihat & ubah datanya sendiri
alter table bills enable row level security;
alter table bill_payments enable row level security;
alter table monthly_balance enable row level security;

create policy "bills_select_own" on bills for select using (auth.uid() = user_id);
create policy "bills_insert_own" on bills for insert with check (auth.uid() = user_id);
create policy "bills_update_own" on bills for update using (auth.uid() = user_id);
create policy "bills_delete_own" on bills for delete using (auth.uid() = user_id);

create policy "payments_select_own" on bill_payments for select using (auth.uid() = user_id);
create policy "payments_insert_own" on bill_payments for insert with check (auth.uid() = user_id);
create policy "payments_update_own" on bill_payments for update using (auth.uid() = user_id);
create policy "payments_delete_own" on bill_payments for delete using (auth.uid() = user_id);

create policy "balance_select_own" on monthly_balance for select using (auth.uid() = user_id);
create policy "balance_insert_own" on monthly_balance for insert with check (auth.uid() = user_id);
create policy "balance_update_own" on monthly_balance for update using (auth.uid() = user_id);
create policy "balance_delete_own" on monthly_balance for delete using (auth.uid() = user_id);
