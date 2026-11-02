// Cron harian (pg_cron 00:00 UTC): kirim Web Push ke user yang punya
// tagihan jatuh tempo hari ini s/d +3 hari, maksimal 1x/hari per langganan.
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@example.com',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
)

function pad(n: number) { return String(n).padStart(2, '0') }

Deno.serve(async () => {
  const now = new Date()
  const monthKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`
  const todayISO = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const todayDay = now.getDate()

  const { data: rows, error } = await supabase
    .from('bill_payments')
    .select('user_id, amount, is_paid, is_active, name_override, due_day_override, bills!inner(name, due_day, archived, is_recurring, target_month)')
    .eq('month', monthKey)
    .eq('bills.archived', false)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Kelompokkan tagihan H-3 per user
  const byUser = new Map<string, string[]>()
  for (const r of rows ?? []) {
    if (!r.is_active || r.is_paid) continue
    const bill = r.bills as unknown as { due_day: number | null, is_recurring: boolean, target_month: string | null }
    if (!bill) continue
    if (!bill.is_recurring && bill.target_month !== monthKey) continue
    const dd = r.due_day_override || bill.due_day
    if (!dd) continue
    const diff = dd - todayDay
    if (diff > 3) continue // telat (diff < 0) ikut — pengingat sampai dibayar
    const name = r.name_override || (r.bills as unknown as { name: string }).name
    const late = diff < 0 ? `telat ${-diff} hari, ` : ''
    const label = `${name} (${late}tgl ${dd}, Rp${Number(r.amount).toLocaleString('id-ID')})`
    const list = byUser.get(r.user_id) ?? []
    list.push(label)
    byUser.set(r.user_id, list)
  }

  if (byUser.size === 0) return Response.json({ sent: 0, due: 0 })

  const { data: subs, error: subErr } = await supabase
    .from('push_subscriptions')
    .select('*')
    .in('user_id', [...byUser.keys()])
    .or(`last_sent_date.is.null,last_sent_date.neq.${todayISO}`)

  if (subErr) return Response.json({ error: subErr.message }, { status: 500 })

  let sent = 0
  await Promise.all((subs ?? []).map(async (sub) => {
    const items = byUser.get(sub.user_id) ?? []
    if (!items.length) return
    const payload = JSON.stringify({
      title: 'Ledger — tagihan jatuh tempo',
      body: items.join('\n'),
      tag: `due-soon-${todayISO}`,
    })
    try {
      await webpush.sendNotification({
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      }, payload, { TTL: 86400 })
      sent++
      await supabase.from('push_subscriptions')
        .update({ last_sent_date: todayISO })
        .eq('id', sub.id)
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) {
        // langganan basi / user unsubscribe
        await supabase.from('push_subscriptions').delete().eq('id', sub.id)
      } else {
        console.error('push gagal', status, err)
      }
    }
  }))

  return Response.json({ due: byUser.size, sent })
})
