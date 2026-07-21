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

**Vue 3 + Supabase SPA** — no Pinia, no router. Auth and navigation handled manually.

### State Management

Single composable `src/lib/useLedger.js` owns all state via `reactive()`:
- Session/auth state
- Current month selection
- Bills, payment records, monthly balance
- Loading/error flags

Components import `useLedger()` directly — shared singleton pattern (not per-instance).

### Data Flow

```
Login.vue → supabase.auth → session in useLedger
Dashboard.vue → useLedger.loadMonth(YYYY-MM)
  ├── bills (recurring + month-specific one-offs)
  ├── bill_payments (per-bill per-month payment status)
  └── monthly_balance (user-input current balance)
```

Adding a bill auto-creates payment records for the current month. Toggling payment updates `bill_payments.is_paid`. Balance input upserts `monthly_balance`.

### Database (Supabase / PostgreSQL)

3 tables, all RLS-enforced on `user_id = auth.uid()`:

| Table | Purpose |
|-------|---------|
| `bills` | Bill definitions (`is_recurring`, `target_month` for one-offs, `archived`) |
| `bill_payments` | Payment status per bill per month; unique on `(bill_id, month)` |
| `monthly_balance` | User-input balance snapshot per month; unique on `(user_id, month)` |

Schema in `supabase/schema.sql`.

### Key Files

| File | Role |
|------|------|
| `src/lib/useLedger.js` | All business logic, CRUD, computed balances |
| `src/lib/month.js` | Date/currency helpers |
| `src/lib/supabase.js` | Supabase client init |
| `src/views/Dashboard.vue` | App shell, month nav, tab switching |
| `src/views/Login.vue` | Auth UI (signin/signup toggle) |
| `vite.config.js` | Base path set to `/billing-tracker/` for GitHub Pages |

### Deployment

GitHub Actions (`.github/workflows/deploy.yml`) builds with repository secrets and deploys to GitHub Pages. Requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set as repo secrets.

## Notes

- UI, README, comments: Indonesian (Bahasa Indonesia)
- Anon key is safe to expose — RLS enforces user isolation at DB level
