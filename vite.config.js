import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// PENTING: ganti '/NAMA_REPO/' sesuai nama repository GitHub kamu,
// misal repo-nya "billing-tracker" -> base: '/billing-tracker/'
// Kalau deploy ke repo "username.github.io" (user/organization page), pakai base: '/'
export default defineConfig({
  base: '/billing-tracker/',
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Ledger — Pencatat Tagihan Bulanan',
        short_name: 'Ledger',
        description: 'Catat dan pantau tagihan bulanan kamu.',
        theme_color: '#10131A',
        background_color: '#10131A',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/billing-tracker/',
        scope: '/billing-tracker/',
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        navigateFallback: '/billing-tracker/index.html',
        // Jangan cache Supabase API calls — butuh auth & harus selalu fresh
        navigateFallbackDenylist: [/^\/rest\//, /^\/auth\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
})
