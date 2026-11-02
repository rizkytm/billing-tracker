-- Jadwal cron harian notify-due: 00:00 UTC (~07:00 WIB)
-- butuh pg_cron + pg_net (default di Supabase hosted).
-- Tanpa vault: fungsi notify-due diset verify_jwt=false (idempoten, dedup harian).
do $$
begin
  set search_path to public, extensions, cron, net;

  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'cron' and p.proname = 'schedule'
  ) then
    raise notice 'pg_cron tidak ada — schedule notify-due dilewati';
    return;
  end if;
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'net' and p.proname = 'http_post'
  ) then
    raise notice 'pg_net tidak ada — schedule notify-due dilewati';
    return;
  end if;

  perform cron.unschedule('notify-due'); -- cegah duplikat kalau diulang
  perform cron.schedule(
    'notify-due',
    '0 0 * * *',
    $cron$
      select net.http_post(
        url := 'https://ucywfnqusilpruuvvdkj.supabase.co/functions/v1/notify-due',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb,
        timeout_milliseconds := 30000
      );
    $cron$
  );
  raise notice 'notify-due dijadwalkan: 0 0 * * *';
end $$;
