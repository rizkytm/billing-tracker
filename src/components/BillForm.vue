<script setup>
import { ref } from 'vue'

const emit = defineEmits(['add'])

const name = ref('')
const amount = ref('')
const dueDay = ref('')
const isRecurring = ref(true)
const errors = ref({ name: '', amount: '', due: '' })

function validate() {
  const e = { name: '', amount: '', due: '' }
  if (!name.value.trim()) e.name = 'Nama tagihan tidak boleh kosong.'
  const amt = Number(amount.value)
  if (amount.value === '' || isNaN(amt) || amt <= 0) e.amount = 'Nominal harus lebih dari 0.'
  if (dueDay.value !== '') {
    const d = Number(dueDay.value)
    if (isNaN(d) || d < 1 || d > 31 || !Number.isInteger(d)) e.due = 'Tanggal harus angka 1-31.'
  }
  return e
}

function submit() {
  const e = validate()
  errors.value = e
  if (e.name || e.amount || e.due) return
  emit('add', {
    name: name.value.trim(),
    amount: Number(amount.value),
    due_day: dueDay.value ? Number(dueDay.value) : null,
    is_recurring: isRecurring.value,
  })
  name.value = ''
  amount.value = ''
  dueDay.value = ''
  isRecurring.value = true
  errors.value = { name: '', amount: '', due: '' }
}
</script>

<template>
  <div class="add-form">
    <h2>Tambah tagihan</h2>
    <form class="form-grid" @submit.prevent="submit">
      <div>
        <input v-model="name" type="text" placeholder="Nama tagihan (mis. Listrik, Internet, Cicilan)"
          :class="{ 'input-invalid': errors.name }" />
        <div class="field-error">{{ errors.name }}</div>
      </div>
      <div class="form-row-split">
        <div>
          <input v-model="amount" type="number" inputmode="numeric" placeholder="Nominal (Rp)"
            :class="{ 'input-invalid': errors.amount }" />
          <div class="field-error">{{ errors.amount }}</div>
        </div>
        <div>
          <input v-model="dueDay" type="number" min="1" max="31" placeholder="Tanggal (opsional, 1-31)"
            :class="{ 'input-invalid': errors.due }" />
          <div class="field-error">{{ errors.due }}</div>
        </div>
      </div>
      <label class="checkbox-row">
        <input type="checkbox" v-model="isRecurring" style="width:auto" />
        Tagihan rutin (muncul otomatis tiap bulan)
      </label>
      <button class="primary-btn" type="submit">Tambah</button>
    </form>
  </div>
</template>
