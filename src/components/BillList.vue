<script setup>
import { ref, computed } from 'vue'
import { formatRupiah, currentMonthKey } from '../lib/month'
import { useLedger } from '../lib/useLedger'

const props = defineProps({
  bills: { type: Array, required: true },
  payments: { type: Array, required: true },
})
const emit = defineEmits(['toggle', 'toggle-active', 'update', 'remove'])

const { state, updatePaymentOverride, clearPaymentOverride } = useLedger()

// --- Sort ---
const sortField = ref(localStorage.getItem('ledger_sort_field') || 'none')
const sortDir = ref(localStorage.getItem('ledger_sort_dir') || 'asc')

function setSortField(val) {
  sortField.value = val
  localStorage.setItem('ledger_sort_field', val)
}
function toggleSortDir() {
  sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  localStorage.setItem('ledger_sort_dir', sortDir.value)
}

const sortedBills = computed(() => {
  const copy = [...props.bills]
  if (sortField.value === 'none') return copy
  copy.sort((a, b) => {
    let av, bv
    if (sortField.value === 'name') { av = a.name.toLowerCase(); bv = b.name.toLowerCase() }
    else if (sortField.value === 'amount') { av = a.amount; bv = b.amount }
    else if (sortField.value === 'date') { av = a.due_day ?? 999; bv = b.due_day ?? 999 }
    if (av < bv) return sortDir.value === 'asc' ? -1 : 1
    if (av > bv) return sortDir.value === 'asc' ? 1 : -1
    return 0
  })
  return copy
})

// --- Helpers ---
const todayDay = new Date().getDate()
const thisMonth = currentMonthKey()

function paymentFor(billId) {
  return props.payments.find(p => p.bill_id === billId)
}

function effectiveName(bill, payment) {
  return payment?.name_override || bill.name
}
function effectiveDueDay(bill, payment) {
  return payment?.due_day_override || bill.due_day
}
function hasOverride(payment) {
  return payment && (payment.name_override || payment.due_day_override || payment.amount !== props.bills.find(b => b.id === payment.bill_id)?.amount)
}

function dueClass(bill, payment) {
  const dd = effectiveDueDay(bill, payment)
  if (!dd || payment?.is_paid) return 'due-normal'
  const m = state.month
  if (m < thisMonth) return 'due-overdue'
  if (m > thisMonth) return 'due-normal'
  if (dd === todayDay) return 'due-today'
  if (dd < todayDay) return 'due-overdue'
  return 'due-normal'
}

function dueLabel(bill, payment) {
  const dd = effectiveDueDay(bill, payment)
  if (!dd) return 'tanpa tanggal tetap'
  const cls = dueClass(bill, payment)
  const suffix = cls === 'due-today'
    ? ' · jatuh tempo hari ini'
    : cls === 'due-overdue' && state.month < thisMonth
      ? ' · tidak dibayar'
      : cls === 'due-overdue'
        ? ' · sudah lewat jatuh tempo'
        : ''
  return 'jatuh tempo tgl ' + dd + suffix
}

// --- Permanent inline edit ---
const editingId = ref(null)
const editName = ref('')
const editAmount = ref('')
const editDueDay = ref('')
const editIsRecurring = ref(true)
const editTargetMonth = ref('')
const editErrors = ref({ name: '', amount: '', due: '' })

function startEdit(bill) {
  overridingId.value = null
  editingId.value = bill.id
  editName.value = bill.name
  editAmount.value = String(bill.amount)
  editDueDay.value = bill.due_day ? String(bill.due_day) : ''
  editIsRecurring.value = bill.is_recurring
  editTargetMonth.value = bill.target_month || state.month
  editErrors.value = { name: '', amount: '', due: '' }
}
function cancelEdit() { editingId.value = null }

function validateEdit() {
  const e = { name: '', amount: '', due: '' }
  if (!editName.value.trim()) e.name = 'Nama tagihan tidak boleh kosong.'
  const amt = Number(editAmount.value)
  if (editAmount.value === '' || isNaN(amt) || amt <= 0) e.amount = 'Nominal harus lebih dari 0.'
  if (editDueDay.value !== '') {
    const d = Number(editDueDay.value)
    if (isNaN(d) || d < 1 || d > 31 || !Number.isInteger(d)) e.due = 'Tanggal harus angka 1-31.'
  }
  return e
}
function saveEdit() {
  const e = validateEdit()
  editErrors.value = e
  if (e.name || e.amount || e.due) return
  emit('update', editingId.value, {
    name: editName.value.trim(),
    amount: Number(editAmount.value),
    due_day: editDueDay.value ? Number(editDueDay.value) : null,
    is_recurring: editIsRecurring.value,
    target_month: editIsRecurring.value ? null : editTargetMonth.value,
  })
  editingId.value = null
}

// --- Monthly override edit ---
const overridingId = ref(null)
const overrideName = ref('')
const overrideAmount = ref('')
const overrideDueDay = ref('')
const overrideErrors = ref({ amount: '', due: '' })

function startOverride(bill, payment) {
  editingId.value = null
  overridingId.value = bill.id
  overrideName.value = payment?.name_override || bill.name
  overrideAmount.value = String(payment?.amount ?? bill.amount)
  overrideDueDay.value = payment?.due_day_override ? String(payment.due_day_override) : (bill.due_day ? String(bill.due_day) : '')
  overrideErrors.value = { amount: '', due: '' }
}
function cancelOverride() { overridingId.value = null }

function validateOverride() {
  const e = { amount: '', due: '' }
  const amt = Number(overrideAmount.value)
  if (overrideAmount.value === '' || isNaN(amt) || amt <= 0) e.amount = 'Nominal harus lebih dari 0.'
  if (overrideDueDay.value !== '') {
    const d = Number(overrideDueDay.value)
    if (isNaN(d) || d < 1 || d > 31 || !Number.isInteger(d)) e.due = 'Tanggal harus angka 1-31.'
  }
  return e
}
async function saveOverride(bill) {
  const e = validateOverride()
  overrideErrors.value = e
  if (e.amount || e.due) return
  const payment = paymentFor(bill.id)
  await updatePaymentOverride(payment, {
    name_override: overrideName.value.trim() !== bill.name ? overrideName.value.trim() : null,
    due_day_override: overrideDueDay.value ? Number(overrideDueDay.value) : null,
    amount: Number(overrideAmount.value),
  })
  overridingId.value = null
}
async function resetOverride(bill) {
  await clearPaymentOverride(paymentFor(bill.id))
  overridingId.value = null
}

// --- Confirm delete ---
const confirmId = ref(null)
function confirmRemove(billId) { confirmId.value = billId }
function doRemove() { emit('remove', confirmId.value); confirmId.value = null }
</script>

<template>
  <div>
    <div class="sort-bar">
      <select :value="sortField" @change="setSortField($event.target.value)">
        <option value="none">Urutan asli</option>
        <option value="name">Nama</option>
        <option value="date">Tanggal jatuh tempo</option>
        <option value="amount">Nilai</option>
      </select>
      <button class="sort-dir-btn" @click="toggleSortDir">
        {{ sortDir === 'asc' ? '↑ Asc' : '↓ Desc' }}
      </button>
    </div>

    <div class="bill-list">
      <div v-if="bills.length === 0" class="empty-state">
        Belum ada tagihan bulan ini. Tambah lewat form di bawah.
      </div>

      <template v-for="bill in sortedBills" :key="bill.id">

        <!-- Permanent edit row -->
        <div v-if="editingId === bill.id" class="bill-edit-row">
          <div class="edit-row-label">Edit permanen</div>
          <div class="edit-grid">
            <div>
              <input type="text" v-model="editName" placeholder="Nama tagihan"
                :class="{ 'input-invalid': editErrors.name }" />
              <div class="field-error">{{ editErrors.name }}</div>
            </div>
            <div>
              <input type="number" v-model="editAmount" placeholder="Nominal"
                :class="{ 'input-invalid': editErrors.amount }" />
              <div class="field-error">{{ editErrors.amount }}</div>
            </div>
            <div>
              <input type="number" v-model="editDueDay" min="1" max="31" placeholder="Tgl (opsional)"
                :class="{ 'input-invalid': editErrors.due }" />
              <div class="field-error">{{ editErrors.due }}</div>
            </div>
          </div>
          <label class="checkbox-row">
            <input type="checkbox" v-model="editIsRecurring" style="width:auto" />
            Tagihan rutin
          </label>
          <div v-if="!editIsRecurring" class="target-month-row">
            <label class="target-month-label">Tagih pada bulan</label>
            <input type="month" v-model="editTargetMonth" />
          </div>
          <div class="bill-edit-actions">
            <button class="btn-cancel" @click="cancelEdit">Batal</button>
            <button class="btn-save" @click="saveEdit">Simpan</button>
          </div>
        </div>

        <!-- Monthly override edit row -->
        <div v-else-if="overridingId === bill.id" class="bill-edit-row override-row">
          <div class="edit-row-label">Override bulan ini saja</div>
          <div class="edit-grid">
            <div>
              <input type="text" v-model="overrideName" placeholder="Nama tagihan" />
              <div class="field-error"></div>
            </div>
            <div>
              <input type="number" v-model="overrideAmount" placeholder="Nominal"
                :class="{ 'input-invalid': overrideErrors.amount }" />
              <div class="field-error">{{ overrideErrors.amount }}</div>
            </div>
            <div>
              <input type="number" v-model="overrideDueDay" min="1" max="31" placeholder="Tgl (opsional)"
                :class="{ 'input-invalid': overrideErrors.due }" />
              <div class="field-error">{{ overrideErrors.due }}</div>
            </div>
          </div>
          <div class="bill-edit-actions">
            <button class="btn-cancel" @click="cancelOverride">Batal</button>
            <button v-if="hasOverride(paymentFor(bill.id))" class="btn-reset" @click="resetOverride(bill)">Reset</button>
            <button class="btn-save" @click="saveOverride(bill)">Simpan</button>
          </div>
        </div>

        <!-- Normal row -->
        <div v-else
          class="bill-item"
          :class="{
            paid: paymentFor(bill.id)?.is_paid,
            inactive: paymentFor(bill.id) && !paymentFor(bill.id).is_active,
          }"
        >
          <button
            class="bill-check"
            :disabled="paymentFor(bill.id) && !paymentFor(bill.id).is_active"
            @click="emit('toggle', paymentFor(bill.id))"
          >
            <span v-if="paymentFor(bill.id)?.is_paid">✓</span>
          </button>
          <div class="bill-info">
            <div class="bill-name">
              {{ effectiveName(bill, paymentFor(bill.id)) }}
              <span v-if="hasOverride(paymentFor(bill.id))" class="badge-override" title="Ada override bulan ini">~</span>
            </div>
            <div class="bill-meta">
              <span :class="dueClass(bill, paymentFor(bill.id))">
                {{ dueLabel(bill, paymentFor(bill.id)) }}
              </span>
              <span v-if="!bill.is_recurring"> · sekali ini saja</span>
              <span v-if="paymentFor(bill.id) && !paymentFor(bill.id).is_active" class="badge-inactive">
                nonaktif bulan ini
              </span>
            </div>
          </div>
          <div class="bill-amount">{{ formatRupiah(paymentFor(bill.id)?.amount ?? bill.amount) }}</div>
          <div class="bill-actions">
            <button
              class="icon-btn active-toggle"
              :class="paymentFor(bill.id)?.is_active ? 'is-active' : 'is-inactive'"
              :title="paymentFor(bill.id)?.is_active ? 'Nonaktifkan bulan ini' : 'Aktifkan lagi'"
              @click="emit('toggle-active', paymentFor(bill.id))"
            >{{ paymentFor(bill.id)?.is_active ? '⏸' : '▶' }}</button>
            <button class="icon-btn override-btn" :class="{ 'has-override': hasOverride(paymentFor(bill.id)) }"
              title="Override bulan ini" @click="startOverride(bill, paymentFor(bill.id))">≈</button>
            <button class="icon-btn" title="Edit permanen" @click="startEdit(bill)">✎</button>
            <button class="icon-btn remove-btn" title="Hapus" @click="confirmRemove(bill.id)">×</button>
          </div>
        </div>
      </template>
    </div>

    <!-- Confirm delete modal -->
    <Teleport to="body">
      <div v-if="confirmId" class="modal-overlay" @click.self="confirmId = null">
        <div class="modal-card">
          <h3>Hapus tagihan?</h3>
          <p>
            "{{ bills.find(b => b.id === confirmId)?.name }}" akan diarsipkan dan tidak muncul lagi.
            Kalau cuma mau berhenti bulan ini, gunakan tombol nonaktifkan (⏸) saja.
          </p>
          <div class="modal-actions">
            <button class="btn-modal-cancel" @click="confirmId = null">Batal</button>
            <button class="btn-modal-danger" @click="doRemove">Hapus</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
