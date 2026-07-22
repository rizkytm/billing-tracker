import { reactive, computed } from 'vue'
import { supabase } from './supabase'
import { currentMonthKey } from './month'

// State global sederhana (tanpa Pinia, cukup untuk skala app ini)
const state = reactive({
  session: null,
  authReady: false,
  month: currentMonthKey(),
  bills: [],        // definisi tagihan (recurring / one-off)
  payments: [],      // status bayar per bulan untuk bulan aktif
  balanceRow: null,  // baris monthly_balance untuk bulan aktif
  loading: false,
  error: null,
})

export function useLedger() {
  async function initAuth() {
    const { data } = await supabase.auth.getSession()
    state.session = data.session
    state.authReady = true
    supabase.auth.onAuthStateChange((_event, session) => {
      state.session = session
    })
  }

  async function signIn(email, password) {
    state.error = null
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) state.error = error.message
    return !error
  }

  async function signUp(email, password) {
    state.error = null
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) state.error = error.message
    return !error
  }

  async function signInWithGoogle() {
    state.error = null
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + import.meta.env.BASE_URL,
      },
    })
    if (error) state.error = error.message
  }

  async function signOut() {
    await supabase.auth.signOut()
    state.bills = []
    state.payments = []
    state.balanceRow = null
  }

  function userId() {
    return state.session?.user?.id
  }

  async function loadMonth(monthKey = state.month) {
    state.loading = true
    state.error = null
    state.month = monthKey
    const uid = userId()
    if (!uid) { state.loading = false; return }

    // Ambil bill yang relevan: recurring aktif, atau one-off yang target_month = bulan ini
    const { data: bills, error: billsErr } = await supabase
      .from('bills')
      .select('*')
      .eq('archived', false)
      .or(`is_recurring.eq.true,target_month.eq.${monthKey}`)
      .order('created_at', { ascending: true })

    if (billsErr) { state.error = billsErr.message; state.loading = false; return }
    state.bills = bills || []

    // Pastikan setiap bill punya baris bill_payments untuk bulan ini (upsert)
    // ignoreDuplicates: true = baris yang sudah ada (dengan is_active & is_paid) tidak ditimpa
    if (state.bills.length > 0) {
      const rows = state.bills.map(b => ({
        user_id: uid,
        bill_id: b.id,
        month: monthKey,
        amount: b.amount,
      }))
      await supabase.from('bill_payments').upsert(rows, {
        onConflict: 'bill_id,month',
        ignoreDuplicates: true,
      })
    }

    const { data: payments, error: payErr } = await supabase
      .from('bill_payments')
      .select('*')
      .eq('month', monthKey)

    if (payErr) { state.error = payErr.message; state.loading = false; return }
    state.payments = payments || []

    const { data: balRows } = await supabase
      .from('monthly_balance')
      .select('*')
      .eq('month', monthKey)
      .maybeSingle()

    state.balanceRow = balRows || null
    state.loading = false
  }

  async function addBill({ name, amount, due_day, is_recurring, target_month }) {
    const uid = userId()
    const payload = {
      user_id: uid,
      name,
      amount,
      due_day: due_day || null,
      is_recurring,
      target_month: is_recurring ? null : (target_month || state.month),
    }
    const { error } = await supabase.from('bills').insert(payload)
    if (error) { state.error = error.message; return false }
    await loadMonth(state.month)
    return true
  }

  async function updateBill(billId, { name, amount, due_day, is_recurring }) {
    const { error } = await supabase
      .from('bills')
      .update({ name, amount, due_day: due_day || null, is_recurring })
      .eq('id', billId)
    if (error) { state.error = error.message; return false }
    await loadMonth(state.month)
    return true
  }

  async function archiveBill(billId) {
    await supabase.from('bills').update({ archived: true }).eq('id', billId)
    await loadMonth(state.month)
  }

  async function togglePaid(payment) {
    const next = !payment.is_paid
    const { error } = await supabase
      .from('bill_payments')
      .update({ is_paid: next, paid_at: next ? new Date().toISOString() : null })
      .eq('id', payment.id)
    if (!error) {
      payment.is_paid = next
      payment.paid_at = next ? new Date().toISOString() : null
    }
  }

  async function toggleActive(payment) {
    const next = !payment.is_active
    const updates = { is_active: next }
    if (!next) updates.is_paid = false  // nonaktifkan = batalkan paid juga
    const { error } = await supabase
      .from('bill_payments')
      .update(updates)
      .eq('id', payment.id)
    if (!error) {
      payment.is_active = next
      if (!next) {
        payment.is_paid = false
        payment.paid_at = null
      }
    }
  }

  async function setBalance(amount) {
    const uid = userId()
    const payload = {
      user_id: uid,
      month: state.month,
      current_balance: amount,
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await supabase
      .from('monthly_balance')
      .upsert(payload, { onConflict: 'user_id,month' })
      .select()
      .maybeSingle()
    if (!error) state.balanceRow = data
  }

  async function clearBalance() {
    const uid = userId()
    await supabase
      .from('monthly_balance')
      .delete()
      .eq('user_id', uid)
      .eq('month', state.month)
    state.balanceRow = null
  }

  async function loadHistory() {
    const { data: payments } = await supabase
      .from('bill_payments')
      .select('month, amount, is_paid, is_active')
      .order('month', { ascending: true })
    const { data: balances } = await supabase
      .from('monthly_balance')
      .select('month, current_balance')
      .order('month', { ascending: true })

    const months = {}
    for (const p of payments || []) {
      if (!p.is_active) continue  // exclude nonaktif dari riwayat
      months[p.month] ??= { month: p.month, total: 0, paid: 0, current_balance: null }
      months[p.month].total += Number(p.amount)
      if (p.is_paid) months[p.month].paid += Number(p.amount)
    }
    for (const b of balances || []) {
      months[b.month] ??= { month: b.month, total: 0, paid: 0, current_balance: null }
      months[b.month].current_balance = Number(b.current_balance)
    }
    return Object.values(months).sort((a, b) => a.month.localeCompare(b.month))
  }

  // Hanya hitung tagihan yang is_active = true
  const totalUnpaid = computed(() =>
    state.payments.filter(p => p.is_active && !p.is_paid).reduce((s, p) => s + Number(p.amount), 0)
  )
  const totalPaid = computed(() =>
    state.payments.filter(p => p.is_active && p.is_paid).reduce((s, p) => s + Number(p.amount), 0)
  )
  const totalAll = computed(() => totalUnpaid.value + totalPaid.value)
  const estimatedRemaining = computed(() => {
    const bal = Number(state.balanceRow?.current_balance || 0)
    return bal - totalUnpaid.value
  })

  return {
    state,
    initAuth, signIn, signUp, signInWithGoogle, signOut,
    loadMonth, addBill, updateBill, archiveBill, togglePaid, toggleActive,
    setBalance, clearBalance, loadHistory,
    totalUnpaid, totalPaid, totalAll, estimatedRemaining,
  }
}
