<script setup>
import { ref, computed, watch } from 'vue'
import { formatRupiah } from '../lib/month'
import { useLedger } from '../lib/useLedger'

const props = defineProps({
  currentBalance: { type: Number, default: null },
  totalUnpaid: { type: Number, required: true },
  totalPaid: { type: Number, required: true },
  estimatedRemaining: { type: Number, required: true },
})
const emit = defineEmits(['save', 'clear'])

const { state } = useLedger()

const input = ref(props.currentBalance ?? '')
watch(() => props.currentBalance, (v) => { input.value = v ?? '' })

function save() {
  const n = Number(input.value)
  if (!isNaN(n) && String(input.value) !== '') emit('save', n)
}

// --- Payday ---
const paydayDate = ref(localStorage.getItem('ledger_payday') || '')
watch(paydayDate, (v) => localStorage.setItem('ledger_payday', v))

const totalUntilPayday = computed(() => {
  if (!paydayDate.value || props.currentBalance === null) return null
  const pd = new Date(paydayDate.value + 'T00:00:00')
  const today = new Date(); today.setHours(0, 0, 0, 0)
  if (pd <= today) return null

  const paydayYM = paydayDate.value.slice(0, 7)
  const paydayDay = pd.getDate()

  if (paydayYM === state.month) {
    // same month — unpaid active bills with due_day <= paydayDay or no due_day
    return state.payments
      .filter(p => p.is_active && !p.is_paid)
      .filter(p => {
        const bill = state.bills.find(b => b.id === p.bill_id)
        return bill?.due_day && bill.due_day <= paydayDay
      })
      .reduce((s, p) => s + Number(p.amount), 0)
  } else {
    // different month — all current unpaid + recurring bills due before payday day
    const currentUnpaid = state.payments
      .filter(p => p.is_active && !p.is_paid)
      .reduce((s, p) => s + Number(p.amount), 0)
    const nextMonthBills = state.bills
      .filter(b => b.is_recurring && b.due_day && b.due_day <= paydayDay)
      .reduce((s, b) => s + Number(b.amount), 0)
    return currentUnpaid + nextMonthBills
  }
})

const estimatedAtPayday = computed(() => {
  if (totalUntilPayday.value === null || props.currentBalance === null) return null
  return props.currentBalance - totalUntilPayday.value
})
</script>

<template>
  <div class="statement">
    <div class="statement-row">
      <span class="label">Total tagihan bulan ini</span>
      <span class="value">{{ formatRupiah(totalUnpaid + totalPaid) }}</span>
    </div>
    <div class="statement-row">
      <span class="label">Sudah dibayar</span>
      <span class="value" style="color: var(--good)">{{ formatRupiah(totalPaid) }}</span>
    </div>
    <div class="statement-row">
      <span class="label">Belum dibayar</span>
      <span class="value" style="color: var(--warn)">{{ formatRupiah(totalUnpaid) }}</span>
    </div>

    <div class="balance-input-row">
      <input
        v-model="input"
        type="number"
        inputmode="numeric"
        placeholder="Sisa uang sekarang (Rp)"
        @keyup.enter="save"
      />
      <button @click="save">Simpan</button>
    </div>

    <div class="statement-row total" v-if="currentBalance !== null">
      <span class="label">Estimasi sisa setelah bayar</span>
      <span class="value" :class="estimatedRemaining >= 0 ? 'positive' : 'negative'">
        {{ formatRupiah(estimatedRemaining) }}
      </span>
    </div>
    <div v-if="currentBalance !== null" style="margin-top:10px; text-align:right">
      <button class="clear-btn" @click="emit('clear')">Clear</button>
    </div>

    <!-- Payday section -->
    <div class="payday-section">
      <div class="payday-input-row">
        <label class="payday-label">Gajian berikutnya</label>
        <input type="date" v-model="paydayDate" class="payday-input" />
      </div>
      <template v-if="totalUntilPayday !== null">
        <div class="statement-row" style="margin-top:6px">
          <span class="label">Tagihan s.d. gajian</span>
          <span class="value" style="color: var(--warn)">{{ formatRupiah(totalUntilPayday) }}</span>
        </div>
        <div class="statement-row total">
          <span class="label">Estimasi sisa saat gajian</span>
          <span class="value" :class="estimatedAtPayday >= 0 ? 'positive' : 'negative'">
            {{ formatRupiah(estimatedAtPayday) }}
          </span>
        </div>
      </template>
      <div v-else-if="paydayDate && currentBalance === null" class="payday-hint">
        Isi sisa uang dulu untuk melihat estimasi.
      </div>
      <div v-else-if="paydayDate && totalUntilPayday === null" class="payday-hint">
        Tanggal gajian sudah lewat.
      </div>
    </div>
  </div>
</template>
