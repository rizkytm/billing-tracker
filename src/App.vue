<script setup>
import { onMounted } from 'vue'
import { useRegisterSW } from 'virtual:pwa-register/vue'
import { useLedger } from './lib/useLedger'
import Login from './views/Login.vue'
import Dashboard from './views/Dashboard.vue'

const { state, initAuth } = useLedger()

onMounted(() => {
  initAuth()
})

const { needRefresh, updateServiceWorker } = useRegisterSW({
  onRegistered(r) {
    // cek update setiap jam
    r && setInterval(() => r.update(), 60 * 60 * 1000)
  },
})
</script>

<template>
  <div v-if="!state.authReady"></div>
  <Login v-else-if="!state.session" />
  <Dashboard v-else />

  <Teleport to="body">
    <div v-if="needRefresh" class="update-toast">
      <span>Versi baru tersedia.</span>
      <button @click="updateServiceWorker()">Perbarui</button>
      <button class="update-dismiss" @click="needRefresh = false">✕</button>
    </div>
  </Teleport>
</template>
