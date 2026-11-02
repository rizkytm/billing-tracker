import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// Navigasi SPA offline -> index.html (pengganti navigateFallback generateSW lama)
registerRoute(new NavigationRoute(
  createHandlerBoundToURL('/billing-tracker/index.html'),
  { denylist: [/^\/rest\//, /^\/auth\//] },
))

// Google Fonts cache-first (pengganti runtimeCaching generateSW lama)
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new CacheFirst({
    cacheName: 'google-fonts-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 })],
  }),
)

self.addEventListener('push', (event) => {
  const data = event.data?.json() || {}
  event.waitUntil(self.registration.showNotification(
    data.title || 'Ledger',
    { body: data.body || 'Tagihan jatuh tempo', tag: data.tag || 'due-soon-push' },
  ))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) return c.focus()
      }
      return clients.openWindow('/billing-tracker/')
    }),
  )
})
