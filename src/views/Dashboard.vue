<script setup>
import { onMounted, ref } from 'vue'
import { useLedger } from '../lib/useLedger'
import { shiftMonthKey, formatMonthLabel } from '../lib/month'
import BalanceCard from '../components/BalanceCard.vue'
import BillList from '../components/BillList.vue'
import BillForm from '../components/BillForm.vue'
import HistoryView from '../components/HistoryView.vue'

const {
  state, loadMonth, addBill, updateBill, archiveBill, togglePaid, toggleActive,
  setBalance, clearBalance,
  totalUnpaid, totalPaid, estimatedRemaining, signOut,
} = useLedger()

const tab = ref('bulan-ini') // 'bulan-ini' | 'riwayat'

onMounted(() => {
  loadMonth()
})

function prevMonth() {
  loadMonth(shiftMonthKey(state.month, -1))
}
function nextMonth() {
  loadMonth(shiftMonthKey(state.month, 1))
}
</script>

<template>
  <div class="shell">
    <div class="masthead">
      <div>
        <h1>Ledger</h1>
        <div class="tag">pencatat tagihan bulanan</div>
      </div>
      <button class="signout-btn" @click="signOut">Keluar</button>
    </div>

    <div class="tabs">
      <button :class="{ active: tab === 'bulan-ini' }" @click="tab = 'bulan-ini'">Bulan Ini</button>
      <button :class="{ active: tab === 'riwayat' }" @click="tab = 'riwayat'">Riwayat</button>
    </div>

    <template v-if="tab === 'bulan-ini'">
      <div class="month-nav">
        <button @click="prevMonth">&larr;</button>
        <span class="month-label">{{ formatMonthLabel(state.month) }}</span>
        <button @click="nextMonth">&rarr;</button>
      </div>

      <BalanceCard
        :current-balance="state.balanceRow ? Number(state.balanceRow.current_balance) : null"
        :total-unpaid="totalUnpaid"
        :total-paid="totalPaid"
        :estimated-remaining="estimatedRemaining"
        @save="setBalance"
        @clear="clearBalance"
      />

      <div v-if="state.loading" class="empty-state">Memuat...</div>
      <BillList
        v-else
        :bills="state.bills"
        :payments="state.payments"
        @toggle="togglePaid"
        @toggle-active="toggleActive"
        @update="updateBill"
        @remove="archiveBill"
      />

      <BillForm @add="addBill" />
    </template>

    <template v-else>
      <HistoryView />
    </template>
  </div>
</template>
