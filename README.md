# Ledger — Pencatat Tagihan Bulanan

Vue 3 + Supabase. PWA, deploy gratis di GitHub Pages.

**Live:** https://rizkytm.github.io/billing-tracker/

## Fitur
- Catat tagihan bulanan: nama, nominal, tanggal jatuh tempo (opsional), rutin atau sekali saja.
- Checklist "sudah dibayar" per bulan — reset otomatis tiap bulan baru untuk tagihan rutin.
- Nonaktifkan tagihan bulan ini tanpa menghapus (tombol ⏸), aktifkan lagi bulan berikutnya.
- Edit tagihan langsung dari daftar (inline edit).
- Urutkan tagihan berdasarkan nama, tanggal jatuh tempo, atau nilai.
- Warna jatuh tempo: oranye = hari ini, merah = sudah lewat.
- Input sisa uang saat ini → estimasi sisa setelah bayar semua yang belum lunas.
- Riwayat bulan-bulan sebelumnya dengan progress bar persentase bayar.
- Login pakai email/password atau Google OAuth.
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
5. Push ke `main` → auto build & deploy.

## Struktur data (Supabase)

- `bills` — definisi tagihan (nama, nominal, tanggal opsional, rutin/tidak, `archived`).
- `bill_payments` — status per bulan per tagihan (`is_paid`, `is_active` untuk skip bulan ini).
- `monthly_balance` — sisa uang yang kamu input per bulan, untuk kalkulasi estimasi.

## Kalau mau lanjut dikembangkan
- Kategori tagihan (listrik, cicilan, langganan, dll).
- Reminder notifikasi H-3 sebelum jatuh tempo (Supabase Edge Function + cron).
- Export riwayat ke CSV.
- Multi-akun/keluarga (share 1 ledger — ubah skema `user_id` jadi `household_id`).
