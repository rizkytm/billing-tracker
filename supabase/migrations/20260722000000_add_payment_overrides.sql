alter table bill_payments add column if not exists name_override text;
alter table bill_payments add column if not exists due_day_override integer check (due_day_override between 1 and 31);
