# Ledger — Pencatat Tagihan Bulanan

Vue 3 + Supabase. PWA, deploy gratis di GitHub Pages.

**Live:** https://rizkytm.github.io/billing-tracker/

## Fitur
- Catat tagihan bulanan: nama, nominal, tanggal jatuh tempo (opsional), rutin atau sekali saja.
- Tagihan sekali: pilih bulan target langsung dari form (tidak perlu navigasi dulu).
- Checklist "sudah dibayar" per bulan — reset otomatis tiap bulan baru untuk tagihan rutin.
- Nonaktifkan tagihan bulan ini tanpa menghapus (tombol ⏸), aktifkan lagi bulan berikutnya.
- Edit tagihan langsung dari daftar (inline edit), termasuk ganti bulan target untuk tagihan sekali.
- Override nama, nominal, dan tanggal jatuh tempo per bulan saja (tombol ≈) tanpa ubah definisi tagihan.
- Urutkan tagihan berdasarkan nama, tanggal jatuh tempo, atau nilai — sort memakai nilai override jika ada.
- Warna jatuh tempo kontekstual: oranye = hari ini, merah = lewat jatuh tempo (bulan lalu = tidak dibayar), normal = bulan depan.
- Input sisa uang saat ini → estimasi sisa setelah bayar semua yang belum lunas.
- Input tanggal gajian berikutnya → estimasi tagihan s.d. gajian + sisa uang saat gajian. Tagihan tanpa tanggal jatuh tempo tidak dihitung (diasumsikan fleksibel).
- Riwayat bulan-bulan sebelumnya dengan progress bar persentase bayar.
- Login pakai email/password atau Google OAuth.
- Notifikasi pengingat tagihan: banner (termasuk yang sudah telat) di dashboard, notifikasi browser saat app terbuka, dan Web Push harian walau app tertutup.
- PWA — bisa diinstall di HP/desktop, cek update otomatis.

## 1. Setup Supabase

### Pakai Supabase CLI (direkomendasikan)

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

### Manual

1. Buat project baru di [supabase.com](https://supabase.com).
2. **SQL Editor** → jalankan `supabase/migrations/20260721000000_init_schema.sql`.
3. Kalau DB sudah ada sebelumnya, jalankan juga:
   ```sql
   ALTER TABLE bill_payments ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
   ```
4. **Authentication → Providers** → aktifkan **Email** dan/atau **Google**.
   - Google OAuth: butuh Client ID + Secret dari [Google Cloud Console](https://console.cloud.google.com). Tambahkan redirect URI: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`.
5. **Authentication → URL Configuration** → tambahkan ke Redirect URLs:
   ```
   http://localhost:5173/billing-tracker/**
   https://YOUR_GITHUB_USERNAME.github.io/billing-tracker/**
   ```
6. **Project Settings → API** → catat `Project URL` dan `anon public` key.

## 2. Setup lokal

```bash
npm install
cp .env.example .env.local
# isi .env.local:
# VITE_SUPABASE_URL=https://xxxx.supabase.co
# VITE_SUPABASE_ANON_KEY=eyJ...
npm run dev
```

## 3. Deploy ke GitHub Pages

1. Push ke repo GitHub, nama repo = `billing-tracker`.
2. Pastikan `base` di `vite.config.js` sesuai nama repo:
   ```js
   base: '/billing-tracker/'
   ```
3. **Settings → Pages → Source** → pilih **GitHub Actions**.
4. **Settings → Secrets and variables → Actions** → tambahkan:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_VAPID_PUBLIC_KEY` (untuk push notification, lihat bagian Notifikasi)
5. Push ke `main` → auto build & deploy.

## 4. Notifikasi (push)

Tiga lapis, semua pakai logika yang sama (`src/lib/dueSoon.js`): tagihan aktif, belum bayar, jatuh tempo dari yang sudah telat s/d +3 hari ke depan.

1. **Banner** di dashboard — daftar tagihan telat/jatuh tempo ≤3 hari. Judul berfungsi toggle collapse (state persist, tap judul untuk buka lagi). Banner juga tampil mode ringkas ("Pengingat jatuh tempo" + tombol aktifkan) selama push belum subscribe walau tidak ada item.
2. **Notifikasi browser** saat app/tab terbuka — otomatis 1x/hari, mati sendiri kalau push aktif (anti-dobel).
3. **Web Push** harian 07:00 WIB — jalan walau app tertutup, dikirim Edge Function `notify-due` yang dipanggil GitHub Actions (`notify-due.yml`, cron `0 0 * * *` UTC).

### Setup fresh install

```bash
# 1. Generate VAPID keys
npx web-push generate-vapid-keys
# -> publik ke .env.local sebagai VITE_VAPID_PUBLIC_KEY
# -> publik + privat ke Supabase secrets:
supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:you@example.com

# 2. DB + function
supabase db push                      # tabel push_subscriptions + jadwal cron (opsional)
supabase functions deploy notify-due  # --use-api kalau Docker kena rate limit

# 3. Secret GitHub (build)
gh secret set VITE_VAPID_PUBLIC_KEY   # pipe via printf, jangan echo -n
```

Aktifkan lewat tombol **"Aktifkan notifikasi"** di banner (izin browser + subscribe push sekaligus). Langganan tersimpan di `push_subscriptions`.

### Test & troubleshooting

- Test manual kirim: Actions → **Notify due bills** → *Run workflow*, atau
  `curl -X POST -H 'Content-Type: application/json' -d '{}' https://YOUR_REF.supabase.co/functions/v1/notify-due`
- Kirim ulang di hari yang sama: set `last_sent_date` = NULL di `push_subscriptions` (dedup 1x/hari).
- Tombol tidak muncul: push sudah subscribe, atau permission `denied` — banner menampilkan petunjuk pulih (setelan situs → Notifikasi → Izinkan → muat ulang). Banner tampil walau tanpa item selama push belum subscribe. Flag `ledger_push_enabled` dibersihkan otomatis kalau subscription sudah mati (mis. izin di-revoke).
- Tagihan telat (lewat jatuh tempo, belum bayar) ikut muncul di banner dan push — tiap hari sampai ditandai lunas/dinonaktifkan.
- Error subscribe tampil di banner + console. VAPID key harus murni base64url — kalau aneh, cek isi bundle (`applicationServerKey`) dan nilai secret GH.

## Struktur data (Supabase)

- `bills` — definisi tagihan (nama, nominal, tanggal opsional, rutin/tidak, `archived`).
- `bill_payments` — status per bulan per tagihan (`is_paid`, `is_active` untuk skip bulan ini; `amount`, `name_override`, `due_day_override` untuk override per bulan).
- `monthly_balance` — sisa uang yang kamu input per bulan, untuk kalkulasi estimasi.
- `push_subscriptions` — langganan Web Push per user (`endpoint` unik, kunci `p256dh`/`auth`, `last_sent_date` untuk dedup harian).

## Roadmap

### Quick wins
- [x] **Notifikasi jatuh tempo** — banner H-3 di dashboard, Web Notification saat app terbuka, dan Web Push harian via Edge Function `notify-due` + cron GitHub Actions (07:00 WIB)
- [ ] **Kategori tagihan** — tag per tagihan (listrik, internet, cicilan, dll), filter di daftar. Tambah kolom `category` di `bills`
- [x] **Override tagihan per bulan** — edit nama, nominal, dan tanggal jatuh tempo di `bill_payments` tanpa ubah definisi tagihan. Tombol `≈` terpisah dari edit permanen (✎). Badge `~` muncul jika ada override aktif.
- [ ] **Export CSV** — download riwayat sebagai spreadsheet, pure frontend
- [ ] **Dark/light theme toggle** — CSS vars sudah bersih, tinggal flip

### UX polish
- [ ] **Swipe to pay** — swipe kanan = tandai lunas, mobile-friendly via pointer events
- [ ] **Salin tagihan bulan lalu** — tombol copy one-off bills dari bulan sebelumnya ke bulan ini
- [ ] **Catatan per pembayaran** — memo singkat per `bill_payments` (mis. "transfer BCA"). Tambah kolom `notes`
- [ ] **Blokir navigasi ke bulan depan** — bulan future belum ada tagihan, cukup block nav
- [ ] **Shortcut keyboard** — tekan `N` untuk fokus ke form tambah tagihan
- [ ] **Haptic feedback** — `navigator.vibrate(10)` saat toggle bayar di mobile

### Fitur besar
- [ ] **Budget target bulanan** — set batas pengeluaran, tampilkan over/under vs total tagihan
- [ ] **Cicilan tracker** — tagihan dengan tenor tetap (mis. 12x), auto-arsip saat lunas. Tambah `installment_total` + `installment_count` di `bills`
- [ ] **Shared ledger** — mode pasangan/keluarga, invite member via email. Ganti `user_id` → `household_id` (perlu redesign skema)
- [ ] **Reminder otomatis** — kirim via email/WhatsApp (Twilio/Fonnte); Edge Function `notify-due` + jadwal harian sudah dipakai untuk push, tinggal tambah channel
