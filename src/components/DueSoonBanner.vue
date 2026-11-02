<script setup>
import { computed, ref, watch } from 'vue'
import { getDueSoon } from '../lib/dueSoon'
import { formatRupiah } from '../lib/month'
import { enablePush } from '../lib/push'
import { useLedger } from '../lib/useLedger'

const { state } = useLedger()

const props = defineProps({
  bills: { type: Array, required: true },
  payments: { type: Array, required: true },
})

const _d = new Date()
const todayKey = `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`

const dueSoon = computed(() => getDueSoon(props.bills, props.payments))

const dismissed = ref(localStorage.getItem('ledger_due_dismissed') === todayKey)

// Notifikasi browser 1x/hari selama app terbuka
// ponytail: hanya jalan selama tab/PWA terbuka — push (Phase 3) tutup celah ini
watch(dueSoon, (list) => {
  if (!list.length) return
  if (localStorage.getItem('ledger_push_enabled')) return // push sudah ambil alih
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  if (localStorage.getItem('ledger_notif_date') === todayKey) return
  const body = list.map(i =>
    `${i.payment?.name_override || i.bill.name} — tgl ${i.dueDay} (${formatRupiah(i.payment?.amount ?? i.bill.amount)})`
  ).join('\n')
  new Notification('Tagihan jatuh tempo', { body, tag: 'due-soon' })
  localStorage.setItem('ledger_notif_date', todayKey)
}, { immediate: true })

async function enableNotif() {
  const uid = state.session?.user?.id
  if (uid && await enablePush(uid)) return
  const perm = await Notification.requestPermission()
  if (perm === 'granted') localStorage.removeItem('ledger_notif_date')
}

function dismiss() {
  localStorage.setItem('ledger_due_dismissed', todayKey)
  dismissed.value = true
}
</script>

<template>
  <div v-if="dueSoon.length && !dismissed" class="due-soon-banner">
    <div class="due-soon-head">
      <strong>Jatuh tempo ≤3 hari</strong>
      <button v-if="typeof Notification !== 'undefined' && Notification.permission === 'default'"
        class="due-soon-enable" @click="enableNotif">Aktifkan notifikasi</button>
      <button class="due-soon-close" @click="dismiss">✕</button>
    </div>
    <ul>
      <li v-for="item in dueSoon" :key="item.bill.id">
        {{ item.payment?.name_override || item.bill.name }}
        · tgl {{ item.dueDay }}
        <span v-if="item.dayDiff === 0"> (hari ini)</span>
        <span v-else-if="item.dayDiff === 1"> (besok)</span>
        <span v-else> (+{{ item.dayDiff }} hari)</span>
        · {{ formatRupiah(item.payment?.amount ?? item.bill.amount) }}
      </li>
    </ul>
  </div>
</template>
