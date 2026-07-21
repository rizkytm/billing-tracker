# Ledger — Pencatat Tagihan Bulanan

Vue 3 + Supabase. Deploy gratis di GitHub Pages.

## Fitur
- Catat tagihan bulanan: nama, nominal, tanggal (opsional), rutin atau sekali saja.
- Checklist "sudah dibayar" per bulan, otomatis reset tiap bulan baru untuk tagihan rutin.
- Input sisa uang saat ini → kalkulasi otomatis estimasi sisa setelah bayar semua tagihan yang belum lunas.
- Riwayat bulan-bulan sebelumnya (total tagihan, total dibayar, tren).
- Login pakai Supabase Auth (email/password) — cuma kamu yang bisa akses datamu.

## 1. Setup Supabase

1. Buat project baru di [supabase.com](https://supabase.com).
2. Buka **SQL Editor**, jalankan isi file `supabase/schema.sql` di repo ini (bikin 3 tabel + Row Level Security policy, jadi data user lain gak akan pernah kelihatan sama kamu).
3. Buka **Authentication > Providers**, pastikan **Email** aktif.
   - Kalau mau langsung pakai tanpa verifikasi email, matikan "Confirm email" di **Authentication > Settings**.
4. Buka **Project Settings > API**, catat:
   - `Project URL`
   - `anon public` key

## 2. Setup lokal

```bash
npm install
cp .env.example .env.local
# isi .env.local dengan Project URL & anon key dari Supabase
npm run dev
```

Buka browser, daftar akun (email/password bebas, ini cuma buat kamu sendiri), lalu mulai catat tagihan.

## 3. Deploy ke GitHub Pages

1. Push project ini ke repo GitHub baru, misal nama repo `billing-tracker`.
2. Edit `vite.config.js`, samakan `base` dengan nama repo:
   ```js
   base: '/billing-tracker/'
   ```
   (Kalau repo-nya `namakamu.github.io`, pakai `base: '/'`.)
3. Di GitHub repo: **Settings > Pages > Build and deployment > Source**, pilih **GitHub Actions**.
4. Di **Settings > Secrets and variables > Actions**, tambahkan 2 repository secrets:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Push ke branch `main` — workflow `.github/workflows/deploy.yml` otomatis build & publish ke GitHub Pages.

Anon key aman dipakai di frontend karena akses data tetap dibatasi Row Level Security (tiap user cuma bisa baca/tulis datanya sendiri).

## Struktur data (Supabase)

- `bills` — definisi tagihan (nama, nominal, tanggal opsional, rutin/tidak).
- `bill_payments` — status lunas per bulan per tagihan (snapshot nominal + checklist).
- `monthly_balance` — sisa uang yang kamu input per bulan, dipakai untuk kalkulasi estimasi.

## Struktur project

```
src/
  lib/
    supabase.js     # koneksi Supabase
    month.js        # helper format bulan & rupiah
    useLedger.js     # semua logic data (auth, CRUD tagihan, kalkulasi)
  components/
    BalanceCard.vue  # kartu statement: total, input sisa uang, estimasi
    BillList.vue     # daftar tagihan + checklist
    BillForm.vue     # form tambah tagihan
    HistoryView.vue  # riwayat bulan sebelumnya
  views/
    Login.vue
    Dashboard.vue
```

## Kalau mau lanjut dikembangkan
- Tambah kategori tagihan (listrik, cicilan, langganan, dll).
- Reminder WhatsApp/notifikasi H-3 sebelum jatuh tempo (bisa pakai Supabase Edge Function + cron).
- Export riwayat ke CSV.
- Multi-akun/keluarga (share 1 ledger ke beberapa user — perlu ubah skema `user_id` jadi `household_id`).
