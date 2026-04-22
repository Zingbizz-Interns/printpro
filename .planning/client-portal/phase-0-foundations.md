# Phase 0 — Foundations

Ship nothing user-visible. Land the plumbing everything else depends on.

## Goal

Customer accounts exist, are linked to existing `job_orders`, are isolated
by RLS, and can receive transactional email.

## Deliverables

1. **Customer auth**
   - Reuse Supabase Auth with a separate `profiles`-style table so staff
     and customers don't collide.
   - **Email confirmation: disabled** (owner's call). Signups get a live
     session immediately; no verification email, no `/portal/verify`
     page. Revisit if spam signups become a problem.
   - New table `customer_profiles`:
     - `id uuid PK` → `auth.users.id`
     - `email text not null`
     - `name text not null`
     - `company_name text` (matches `job_orders.company_name`)
     - `contact_number text`
     - `gst_no text`
     - `billing_address text`
     - `gst_certificate_url text` (Supabase Storage path)
     - `created_at timestamptz default now()`
   - Sign-up flow: email + password. Email verification required before
     they can see any order data.

2. **Customer ↔ jobs link**
   - Add `job_orders.customer_user_id uuid references customer_profiles(id)`
     (nullable — historical jobs won't have one).
   - Backfill strategy: on first login, match any `job_orders` rows where
     `lower(trim(email_id)) = lower(trim(auth.email))` and assign
     `customer_user_id`. Flag unmatched for manual staff linking.
   - Staff UI gains a "Link to customer account" action on the job detail
     page (small, deferrable to Phase 1 if time-pressed).

3. **RLS policies (the important bit)**
   - `job_orders`: customer can `SELECT` only where
     `customer_user_id = auth.uid()`.
   - `job_items`, `partial_payments`: same via join on `job_order_id`.
   - `customer_profiles`: customer can `SELECT` + `UPDATE` only own row.
   - Staff role bypass: existing staff policies unchanged; add a
     `role = 'staff' OR role = 'owner'` escape hatch on every new policy.

4. **Route tree — real URL segment, not a route group**
   - `app/portal/layout.tsx` — customer shell (logo, logout, nav).
   - `app/portal/page.tsx` — dashboard (stub in Phase 0, real in Phase 1).
   - `app/portal/signup/page.tsx` — customer-only signup flow.
   - **Login is unified at `/login`** (originally a separate
     `app/portal/login` existed — removed during Phase 1 in favour of
     role-based routing from a single login page).
   - **Why a segment and not a `(portal)` group**: a route group
     wouldn't change URLs, so the original plan's `/login` under
     `(portal)` would have collided with staff `/login`. A real segment
     keeps `/portal/*` clean.
   - Auth gating is client-side in `app/portal/layout.tsx`, mirroring
     the existing staff pattern in `app/(app)/layout.tsx` — no new
     middleware.

5. **Email infrastructure** (Gmail SMTP)
   - `lib/email/transport.ts` — nodemailer SMTP transport pointed at
     `smtp.gmail.com:587`, env-driven.
   - `lib/email/send.ts` — typed `sendEmail({ to, template, data })`.
   - `lib/email/templates/` — one file per template, exports `subject` +
     `html`/`text` render fns. Start with just a `welcome.ts` stub so
     Phase 1 has something to import.
   - **Gmail account setup**:
     - Use a dedicated Google account (e.g., `sprints.notifications@gmail.com`)
       — do NOT use the owner's personal Gmail.
     - Enable 2FA on that account, then generate an **App Password**
       (16-char) at myaccount.google.com/apppasswords. Use the App
       Password as `SMTP_PASS` — not the real account password.
   - Env (add to `.env.example`):
     ```
     SMTP_HOST=smtp.gmail.com
     SMTP_PORT=587
     SMTP_USER=sprints.notifications@gmail.com
     SMTP_PASS=<16-char app password>
     SMTP_FROM="S Prints <sprints.notifications@gmail.com>"
     ```
   - **Known limits to design around** (revisit if we hit them):
     - ~500 emails/day on free Gmail, ~2,000/day on Workspace.
     - `From` address is locked to the Gmail account (or verified
       aliases). Customers will see `@gmail.com` in the sender.
     - No bounce/complaint webhooks — just SMTP-level send failures.
     - Batch sends should stay serial with a small delay to avoid
       rate-limit soft-blocks.

6. **Types**
   - Extend `types/db.ts` with `CustomerProfileRow` and update
     `JobOrderRow` to include `customer_user_id`.
   - Add a `CustomerProfile` camelCase type in `lib/domain/mappers.ts`.

## Files touched / added

```
app/portal/layout.tsx                   NEW
app/portal/page.tsx                     NEW (dashboard stub)
app/portal/signup/page.tsx              NEW
app/(auth)/login/page.tsx               EDIT (unified login; routes by role)
lib/auth/resolve-role.ts                NEW (role → landing-page resolution)
lib/auth/customer-store.ts              NEW  (Zustand, parallel to staff store)
lib/auth/customer-session-sync.tsx      NEW
lib/email/transport.ts                  NEW
lib/email/send.ts                       NEW
lib/email/templates/welcome.ts          NEW
types/db.ts                             EDIT
lib/domain/mappers.ts                   EDIT  (adds dbToCustomerSessionUser + customer_user_id pass-through)
lib/domain/draft.ts                     EDIT  (seeds customerUserId: null on new drafts)
.env.example                            EDIT
supabase/migrations/0001_customer_portal_foundations.sql  NEW

# Deferred to Phase 1 (account settings page needs them):
#   lib/db/customers.ts   EDIT  (add customer_profiles CRUD helpers)
#   lib/db/storage.ts     EDIT  (customer-documents bucket helpers)
```

## Acceptance criteria

- [ ] A new user can sign up, verify email, and log in at
      `/portal/login`.
- [ ] Logged-in customer hits `/portal` and lands on a stub dashboard —
      no 500s, no leaked staff data.
- [ ] A customer querying `job_orders` via the Supabase JS client
      returns **only** rows where `customer_user_id = auth.uid()`
      (verified with a second account).
- [ ] Staff app is unaffected — existing `/kanban`, `/jobs/*`, etc.
      continue to work, and staff still see all jobs.
- [ ] `sendEmail({ to, template: 'welcome', data: {...} })` lands a
      real email in a test inbox using the configured SMTP.

## Risks / open decisions

- **Same auth.users, two profile tables** vs. a `user_type` column on a
  single profile table. Going with two tables keeps staff and customer
  schemas independent. Revisit if it causes auth UX pain.
- **Email matching for backfill** is fragile (customers sign up with a
  different email than the one on file). Manual staff linking is the
  fallback — acceptable for v1.
- **SMTP provider — decided: Gmail SMTP** (both dev and prod for v1).
  Accepted tradeoffs: 500/day send cap, sender visible as `@gmail.com`,
  no bounce webhooks, weaker deliverability vs. a transactional
  provider. Switch to Resend / SES / Postmark later if we hit the cap
  or deliverability issues surface — transport layer is isolated in
  `lib/email/transport.ts`, so the swap is one file.
