<script setup>
import { ref, watch } from 'vue'
import { formatRupiah } from '../lib/month'

const props = defineProps({
  currentBalance: { type: Number, default: null },
  totalUnpaid: { type: Number, required: true },
  totalPaid: { type: Number, required: true },
  estimatedRemaining: { type: Number, required: true },
})
const emit = defineEmits(['save', 'clear'])

const input = ref(props.currentBalance ?? '')
watch(() => props.currentBalance, (v) => { input.value = v ?? '' })

function save() {
  const n = Number(input.value)
  if (!isNaN(n) && String(input.value) !== '') emit('save', n)
}
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
  </div>
</template>
