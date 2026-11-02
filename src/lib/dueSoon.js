import { currentMonthKey } from './month'

// Satu-satunya sumber logika H-3 (banner, notifikasi, push pakai ini)
export function getDueSoon(bills, payments, today = new Date()) {
  const todayDay = today.getDate()
  const month = currentMonthKey(today)
  const out = []
  for (const bill of bills) {
    const payment = payments.find(p => p.bill_id === bill.id)
    if (payment) {
      if (!payment.is_active || payment.is_paid) continue
      if (payment.month && payment.month !== month) continue
    }
    const dd = payment?.due_day_override || bill.due_day
    if (!dd) continue
    const dayDiff = dd - todayDay
    // telat (diff < 0) ikut serta — pengingat sampai dibayar
    if (dayDiff > 3) continue
    out.push({ bill, payment, dayDiff, dueDay: dd })
  }
  return out.sort((a, b) => a.dueDay - b.dueDay)
}
