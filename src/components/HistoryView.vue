<script setup>
import { onMounted, ref } from 'vue'
import { useLedger } from '../lib/useLedger'
import { formatMonthLabel, formatRupiah } from '../lib/month'

const { loadHistory } = useLedger()
const rows = ref([])
const loading = ref(true)

onMounted(async () => {
  rows.value = await loadHistory()
  loading.value = false
})

function pct(r) {
  return r.total > 0 ? Math.round(r.paid / r.total * 100) : 0
}
</script>

<template>
  <div>
    <div v-if="loading" class="empty-state">Memuat riwayat...</div>
    <div v-else-if="rows.length === 0" class="empty-state">Belum ada riwayat bulan sebelumnya.</div>
    <div v-else>
      <div v-for="r in rows" :key="r.month" class="history-row">
        <span>{{ formatMonthLabel(r.month) }}</span>
        <div class="history-bar-track">
          <div class="history-bar-fill" :style="{ width: pct(r) + '%' }"></div>
        </div>
        <span class="history-stats">
          <span class="history-pct" :class="pct(r) === 100 ? 'pct-full' : ''">{{ pct(r) }}%</span>
          <span class="history-amounts">{{ formatRupiah(r.paid) }} / {{ formatRupiah(r.total) }}</span>
        </span>
      </div>
    </div>
  </div>
</template>
