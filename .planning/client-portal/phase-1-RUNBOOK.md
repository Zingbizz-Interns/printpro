# Phase 1 Runbook — How to Go Live

Code shipped. Two Supabase migrations to apply (5–10 min total), then
smoke-test in a browser.

## 1. Apply migration 0002 — customer-documents storage bucket

Supabase dashboard → **SQL Editor** → paste the full contents of
`supabase/migrations/0002_customer_documents_bucket.sql` → run.

What it does:
- Creates a private `customer-documents` bucket.
- Adds RLS on `storage.objects` so each customer can only read/write
  objects under their own `{uuid}/...` path. Staff (via `is_staff()`)
  can read/write everything.

Verify:
- Dashboard → **Storage** → bucket `customer-documents` exists and is
  **private** (public = off).

## 2. Apply migration 0003 — realtime publication

Supabase dashboard → **SQL Editor** → paste
`supabase/migrations/0003_realtime_publication.sql` → run.

### Why this matters (read before running)

Supabase realtime fires `postgres_changes` events only for tables
explicitly added to the `supabase_realtime` publication. **Both the
staff kanban live-sync and the portal "Live" indicator depend on this.**
There's a non-trivial chance this was never configured — check with:

```sql
select tablename from pg_publication_tables
  where pubname = 'supabase_realtime' order by tablename;
```

If `job_orders` / `job_items` / `partial_payments` are missing from the
result, realtime has never worked (the staff kanban was refetching via
window-focus, TanStack Query polling, etc. — not live push). The
migration fixes this. Re-running the diagnostic after should show all 5
tables.

## 3. Smoke-test Phase 1 (5 min)

1. Sign into the portal as a customer (`/login`).
2. **Dashboard** (`/portal`): should show three stat tiles (Active
   orders, Total orders, Outstanding) and in-progress cards for any
   non-delivered jobs linked to your account.
3. **Orders** (`/portal/orders`): table/list of every job on your
   account. Search, status filter, and paid/outstanding filter should
   all work client-side.
4. **Order detail** (`/portal/orders/<id>`): items table, totals block
   (matches staff-side to the rupee), payment history, and a
   **Download invoice** button that produces a PDF.
5. **Account** (`/portal/account`):
   - Edit name, company, contact, GSTIN, billing address → Save → green
     check appears briefly.
   - Upload a GST certificate (PDF/JPG/PNG, ≤ 5 MB) → "On file" row
     appears with a **View** link that opens the file.
   - Change password (min 8 chars, must match) → "Password updated"
     confirmation.
6. **Live** indicator in the top bar should read **Live** (green)
   within ~1 second of loading the dashboard. If it stays at
   "Connecting", migration 0003 wasn't applied.
7. **Realtime test**: keep `/portal/orders` open; in another tab, as
   staff, change a job's status on the kanban. The portal view should
   update without refresh.
8. **Staff regression check**: log into staff app → `/kanban`, job
   detail, customer edit — should all still work unchanged.

## 4. Linking customer accounts to jobs

Until the Phase 2 staff UI for account-linking ships, you'll keep
linking manually (same as end of Phase 0):

```sql
-- Find the customer:
select id, email, name from public.customer_profiles
  where email = 'them@example.com';

-- Link their jobs:
update public.job_orders
  set customer_user_id = '<customer uuid>'
  where lower(trim(email_id)) = 'them@example.com';
```

## 5. Known limits (Phase 2+ material)

- **Proof approval** isn't wired yet — portal shows design/print
  statuses as read-only pills. Phase 2 adds the Approve / Request
  Changes flow.
- **Email notifications** (ready-for-pickup, proof-ready) aren't
  sending — transport is set up from Phase 0 but no triggers fire.
  Phase 3 wires those.
- **`special_notes` and per-item `remarks` stay hidden** from
  customers by design — these are staff-internal.
