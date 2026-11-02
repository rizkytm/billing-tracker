import { supabase } from './supabase'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

export async function enablePush(userId) {
  if (typeof Notification === 'undefined') return false
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') return false
  if (!('PushManager' in window) || !import.meta.env.VITE_VAPID_PUBLIC_KEY) return false

  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY),
  })
  const json = sub.toJSON()
  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: userId,
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
  }, { onConflict: 'endpoint' })
  if (error) throw new Error('Supabase: ' + error.message) // biar kelihatan di banner
  // penanda supaya notifikasi in-app (tab terbuka) tidak dobel dengan push
  localStorage.setItem('ledger_push_enabled', '1')
  return true
}
