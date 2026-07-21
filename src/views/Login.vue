<script setup>
import { ref } from 'vue'
import { useLedger } from '../lib/useLedger'

const { state, signIn, signUp } = useLedger()

const email = ref('')
const password = ref('')
const mode = ref('signin') // 'signin' | 'signup'
const busy = ref(false)
const notice = ref('')

async function submit() {
  busy.value = true
  notice.value = ''
  if (mode.value === 'signin') {
    await signIn(email.value, password.value)
  } else {
    const ok = await signUp(email.value, password.value)
    if (ok) notice.value = 'Akun dibuat. Cek email untuk konfirmasi (jika diaktifkan), lalu masuk.'
  }
  busy.value = false
}
</script>

<template>
  <div class="auth-shell">
    <div class="auth-card">
      <h1>Ledger</h1>
      <p class="sub">Pencatat tagihan bulanan pribadi.</p>

      <div v-if="state.error" class="auth-error">{{ state.error }}</div>
      <div v-if="notice" class="auth-error" style="color: var(--good)">{{ notice }}</div>

      <form @submit.prevent="submit">
        <input v-model="email" type="email" placeholder="Email" required autocomplete="email" />
        <input v-model="password" type="password" placeholder="Password" required autocomplete="current-password" />
        <button class="primary-btn" type="submit" :disabled="busy">
          {{ busy ? 'Memproses...' : (mode === 'signin' ? 'Masuk' : 'Daftar') }}
        </button>
      </form>

      <div class="auth-toggle">
        <span v-if="mode === 'signin'">Belum punya akun?</span>
        <span v-else>Sudah punya akun?</span>
        <button @click="mode = mode === 'signin' ? 'signup' : 'signin'">
          {{ mode === 'signin' ? 'Daftar' : 'Masuk' }}
        </button>
      </div>
    </div>
  </div>
</template>
