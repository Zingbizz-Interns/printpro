# Phase 0 Runbook — How to Go Live

Code is landed. Before the portal works end-to-end, you need to apply
the schema migration and wire up Gmail SMTP. Estimated time: **20–30
minutes** with DNS not required.

## 1. Apply the Supabase migration (5–10 min)

The migration enables RLS on existing business tables. If staff RLS
was previously off, this is a behavior change — re-verify staff can
still read their jobs after applying.

1. Open the Supabase dashboard → **SQL Editor** → **New query**.
2. Run the diagnostics first (copy from the top of
   `supabase/migrations/0001_customer_portal_foundations.sql`):
   ```sql
   select tablename, rowsecurity from pg_tables where schemaname='public';
   select tablename, policyname, cmd, roles, qual
     from pg_policies where schemaname='public' order by tablename;
   ```
   Save the output — you'll compare post-migration.
3. Paste the entire migration file into a new SQL query and run it.
4. Smoke-test as described in the **POST-APPLY VERIFICATION** section at
   the bottom of the migration file:
   - Log into the staff app → `/kanban` should load all jobs normally.
   - If staff sees zero jobs, something in the RLS is off. **Do not
     proceed**; re-run the diagnostic queries and check that the
     staff's `profiles.id` matches `auth.uid()` and `is_active = true`.

## 2. Configure Supabase Auth settings (2 min)

In the Supabase dashboard → **Authentication** → **Providers** → **Email**:
- ✅ Enable **Email** provider
- ❌ **Disable "Confirm email"** — per the owner's decision, signups are
  live immediately, no verification email.
- **Site URL** / **Redirect URLs**: not needed for Phase 0 (those only
  matter for out-of-band flows like password reset or OAuth, which we
  don't have yet). Leave defaults.

## 3. Set up Gmail SMTP (10 min)

1. Create (or pick) a dedicated Google account — e.g.
   `sprints.notifications@gmail.com`. **Not your personal Gmail.**
2. Enable **2-Step Verification**:
   `myaccount.google.com/security` → 2-Step Verification → turn on.
3. Generate an **App Password**:
   `myaccount.google.com/apppasswords` → App name "S Prints Portal"
   → copy the 16-character password.
4. Add to `.env.local` (see `.env.example` for the full block):
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=sprints.notifications@gmail.com
   SMTP_PASS=<16-char app password, no spaces>
   SMTP_FROM="S Prints <sprints.notifications@gmail.com>"
   EMAIL_REPLY_TO=<your real shop inbox>
   ```
5. Restart the dev server: `npm run dev`.

## 4. Smoke-test the portal (5 min)

1. In an **incognito window**, go to `/portal/signup`.
2. Fill in name/email/password and submit.
3. You should land on `/portal` (dashboard stub) immediately — no
   verification step.
4. In the Supabase dashboard → **Table editor** → `customer_profiles` →
   confirm a row exists with your uuid, email, and name.
5. Sign out → visiting `/portal` should redirect to `/login`.
6. Sign into the staff app at `/login` → `/kanban` should still show all
   jobs. (RLS regression check.)

## 5. Known gaps (intentional — filled in later phases)

- **No welcome email yet.** The `welcome` template exists but isn't
  wired to a trigger; Supabase sends the verification email, which is
  all Phase 0 needs.
- **No staff "link customer to job" UI yet.** Customers signing up won't
  see any jobs until staff manually sets `customer_user_id` on a
  `job_orders` row (via the Supabase dashboard, for now). Phase 1 adds
  a proper linking action.
- **Customer account settings page stub.** `/portal/account` is not
  built yet — that's Phase 1.

## 6. Rollback

If anything breaks and you need to undo the migration, run in the SQL
editor:

```sql
drop trigger if exists on_auth_user_created_customer on auth.users;
drop function if exists public.handle_new_customer_user();
drop trigger if exists customer_profiles_touch_updated_at on public.customer_profiles;

-- Drop customer-facing policies (staff policies can stay; they're harmless)
drop policy if exists job_orders_select        on public.job_orders;
drop policy if exists job_items_select         on public.job_items;
drop policy if exists partial_payments_select  on public.partial_payments;

-- Only drop the table if you're sure no signups have happened
-- drop table if exists public.customer_profiles;

-- Drop the helper LAST (other policies reference it)
-- drop function if exists public.is_staff();
```

If you also want to **disable RLS** on the business tables (undo the
hardening):

> **Only disable RLS on tables where the step-1.2 diagnostics showed
> `rowsecurity = false` beforehand.** If a table had RLS already on with
> its own policies before this migration, disabling it now would
> regress your security posture — keep RLS on and just drop the
> *policies* this migration added.

```sql
-- Tables that had rowsecurity=false before the migration:
alter table public.job_orders       disable row level security;
alter table public.job_items        disable row level security;
alter table public.partial_payments disable row level security;
-- etc for profiles / customers / products if they too started with RLS off
```
