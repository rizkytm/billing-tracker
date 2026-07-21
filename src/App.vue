<script setup>
import { onMounted } from 'vue'
import { useLedger } from './lib/useLedger'
import Login from './views/Login.vue'
import Dashboard from './views/Dashboard.vue'

const { state, initAuth } = useLedger()

onMounted(() => {
  initAuth()
})
</script>

<template>
  <div v-if="!state.authReady"></div>
  <Login v-else-if="!state.session" />
  <Dashboard v-else />
</template>
