# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Dev server (Vite HMR)
npm run build     # Production build → dist/
npm run preview   # Preview production build locally
```

No test runner or linter configured.

## Environment

Copy `.env.example` → `.env.local` and fill:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Architecture

**Vue 3 + Supabase SPA** — no Pinia, no router. Auth and navigation handled manually. PWA via `vite-plugin-pwa`.

### State Management

Single composable `src/lib/useLedger.js` owns all state via `reactive()`:
- Session/auth state
- Current month selection
- Bills, payment records, monthly balance
- Loading/error flags

Components import `useLedger()` directly — shared singleton pattern (not per-instance).

### Data Flow

```
Login.vue → supabase.auth (email or Google OAuth) → session in useLedger
Dashboard.vue → useLedger.loadMonth(YYYY-MM)
  ├── bills (recurring + month-specific one-offs, excludes archived)
  ├── bill_payments (per-bill per-month: is_paid, is_active, amount)
  └── monthly_balance (user-input current balance)
```

`loadMonth` upserts payment rows with `ignoreDuplicates: true` — existing `is_paid`/`is_active` state preserved, new months get fresh rows with defaults.

### Database (Supabase / PostgreSQL)

3 tables, all RLS-enforced on `user_id = auth.uid()`:

| Table | Purpose |
|-------|---------|
| `bills` | Bill definitions (`is_recurring`, `target_month` for one-offs, `archived` for soft-delete) |
| `bill_payments` | Payment status per bill per month; `is_active` = per-month skip flag; `amount`, `name_override`, `due_day_override` = per-month overrides; unique on `(bill_id, month)` |
| `monthly_balance` | User-input balance snapshot per month; unique on `(user_id, month)`. Delete row to clear. |

Schema: `supabase/schema.sql`. Migration: `supabase/migrations/20260721000000_init_schema.sql`.

Existing DB migration needed:
```sql
ALTER TABLE bill_payments ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
```

Migration `20260722000000_add_payment_overrides.sql` adds `name_override` and `due_day_override` to `bill_payments`.

### useLedger.js — exported functions

| Function | Description |
|----------|-------------|
| `loadMonth(key)` | Fetch bills + payments + balance for YYYY-MM |
| `addBill(data)` | Insert bill, reload month. `data.target_month` used when `is_recurring=false` |
| `updateBill(id, data)` | Update bill fields incl. `target_month`, reload month |
| `updatePaymentOverride(payment, data)` | Override `amount`, `name_override`, `due_day_override` on `bill_payments` for current month only |
| `clearPaymentOverride(payment)` | Reset overrides, restore `amount` from bill definition |
| `archiveBill(id)` | Set `archived=true`, reload month |
| `togglePaid(payment)` | Flip `is_paid` on bill_payments row |
| `toggleActive(payment)` | Flip `is_active`; deactivating also clears `is_paid` |
| `setBalance(amount)` | Upsert monthly_balance |
| `clearBalance()` | Delete monthly_balance row for current month |
| `loadHistory()` | Aggregate paid/total per month across all months |
| `signIn/signUp/signOut` | Email auth |
| `signInWithGoogle` | OAuth redirect; `redirectTo` = `window.location.origin + BASE_URL` |

Computeds `totalUnpaid`, `totalPaid`, `totalAll`, `estimatedRemaining` only count `is_active = true` payments.

### Key Files

| File | Role |
|------|------|
| `src/lib/useLedger.js` | All business logic, CRUD, computed balances |
| `src/lib/month.js` | Date/currency helpers |
| `src/lib/supabase.js` | Supabase client init |
| `src/App.vue` | Root — auth gate + PWA update toast via `useRegisterSW` |
| `src/views/Dashboard.vue` | App shell, month nav, tab switching |
| `src/views/Login.vue` | Auth UI — email form + Google button |
| `src/components/BillList.vue` | Sort bar (uses override values), bill rows, permanent edit (✎), monthly override edit (≈), confirm modal, active toggle, due date color per month context |
| `src/components/BillForm.vue` | Add bill form with field-level validation, target month picker for one-off bills |
| `src/components/BalanceCard.vue` | Statement card with balance input + clear button |
| `src/components/HistoryView.vue` | Monthly history with paid% progress bar |
| `vite.config.js` | Base `/billing-tracker/`, VitePWA plugin config |
| `public/icon.svg` | App icon (SVG, "L" mark) |

### PWA

`vite-plugin-pwa` with `generateSW` mode. SW precaches all app assets. Supabase API calls not cached (network only). `App.vue` uses `useRegisterSW` from `virtual:pwa-register/vue` — shows update toast when new SW available, checks for updates every hour.

### Deployment

GitHub Actions (`.github/workflows/deploy.yml`) builds with repository secrets and deploys to GitHub Pages. Requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set as repo secrets.

## Notes

- UI, README, comments: Indonesian (Bahasa Indonesia)
- Anon key safe to expose — RLS enforces user isolation at DB level
- `supabase/.temp/` is gitignored (contains linked project ref)
