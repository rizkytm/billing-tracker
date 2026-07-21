<script setup>
import { onMounted, ref, computed } from 'vue'
import { useLedger } from '../lib/useLedger'
import { formatMonthLabel, formatRupiah } from '../lib/month'

const { loadHistory } = useLedger()
const rows = ref([])
const loading = ref(true)

onMounted(async () => {
  rows.value = await loadHistory()
  loading.value = false
})

const maxTotal = computed(() => Math.max(1, ...rows.value.map(r => r.total)))
</script>

<template>
  <div>
    <div v-if="loading" class="empty-state">Memuat riwayat...</div>
    <div v-else-if="rows.length === 0" class="empty-state">Belum ada riwayat bulan sebelumnya.</div>
    <div v-else>
      <div v-for="r in rows" :key="r.month" class="history-row">
        <span>{{ formatMonthLabel(r.month) }}</span>
        <div class="history-bar-track">
          <div class="history-bar-fill" :style="{ width: (r.total / maxTotal * 100) + '%' }"></div>
        </div>
        <span style="text-align:right">{{ formatRupiah(r.paid) }} / {{ formatRupiah(r.total) }}</span>
      </div>
    </div>
  </div>
</template>
