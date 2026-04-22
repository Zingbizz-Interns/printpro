# Phase 2 Runbook — Proof Approval

Code shipped. One migration to apply (2–3 min), one env var to add,
then smoke-test in a browser.

## 1. Apply migration 0004 — proof_reviews + triggers

Supabase dashboard → **SQL Editor** → paste
`supabase/migrations/0004_proof_reviews.sql` → run.

What it does:

- Adds `public.proof_reviews` (one row per customer decision) with
  RLS. Customers can read/insert their own rows; staff can read/write
  all rows. No UPDATE/DELETE exposed to anyone — a decision is a
  signed event.
- Adds `job_items.proof_uploaded_at` timestamptz. A `BEFORE INSERT`
  trigger stamps it on any new row with an `image_url`; a
  `BEFORE UPDATE` trigger re-stamps it when staff changes the image
  and, if the item was previously `Design - Approved`, resets status
  to `Design - In Progress` so the customer re-reviews.
- Adds a SECURITY DEFINER trigger
  `apply_proof_review_decision` — when a customer inserts a row with
  `decision = 'approved'`, the trigger flips `job_items.design_status`
  to `Design - Approved`. The customer still has no direct UPDATE on
  `job_items` (blocked by the RLS from Phase 0) — status change rides
  in via the trigger only.
- Adds `proof_reviews` to the `supabase_realtime` publication so the
  staff kanban badge updates live.

**Backfill caveat**: every existing `job_item` that has an
`image_url` and no approval recorded yet will appear as "awaiting
approval" to the customer on first login after rollout. That's the
intended behaviour — but expect a short burst of customer activity.

Verify (in Supabase SQL Editor):

```sql
-- Table + policies exist
select policyname from pg_policies
  where schemaname='public' and tablename='proof_reviews';

-- Triggers exist
select tgname from pg_trigger where tgname like '%proof%';

-- Publication includes proof_reviews
select tablename from pg_publication_tables
  where pubname='supabase_realtime' and tablename='proof_reviews';
```

## 2. Add EMAIL_OWNER to `.env.local`

Staff emails are not stored in `public.profiles` (only in `auth.users`)
and the portal API route runs under the customer's session, so it
can't fan out to individual staff. For Phase 2, the
`changes-requested` email goes to a single shop inbox:

```
EMAIL_OWNER=owner@sprints.example
```

If `EMAIL_OWNER` is unset the route falls back to `EMAIL_REPLY_TO`.
If both are unset the route returns 500 on the email step but the
review row is still persisted.

Phase 3 can widen the fan-out once we decide whether to give
`public.profiles` an email column or switch to a service-role-backed
notifier.

## 3. Smoke-test Phase 2 (5 min)

### Customer flow

1. Sign in at `/login` as a customer with at least one job that has
   a `job_item.image_url`.
2. Open `/portal/orders/<id>` — each item with a proof shows a
   **Review proof** button under the Proof column; items without an
   image show "Proof not yet uploaded".
3. Click **Review proof**:
   - The modal opens with the full-size image (clickable link to
     open in a new tab).
   - Click **Approve proof** → row persists, modal closes, cell
     flips to a green "✓ Approved <date>" badge.
   - On another item click **Request changes** → textarea is
     required; submit → cell flips to amber "⟳ Changes requested"
     with the comment preview + a **Revise request** link that
     re-opens the modal.

### Staff flow

4. In a different tab, log into staff app (`/login` routes to
   `/kanban`).
5. On the kanban, the affected job's card shows a small badge:
   - **Awaiting (N)** (blue) — items pending customer decision
   - **Changes (N)** (amber) — current decision is changes_requested
   - **Approved** (green) — every item with a proof has been approved
   (Changes wins over Awaiting, Awaiting wins over Approved.)
6. Open `/jobs/<id>` — below the form, a "Proof reviews" card lists
   every review per item with timestamps. Historical reviews
   (created before the current `proof_uploaded_at`) are shown in
   muted text with a "superseded" tag.

### Re-upload flow

7. As staff, swap an item's image on a job that was previously
   approved → save. On refresh, the item's `design_status` should
   have flipped from `Design - Approved` to `Design - In Progress`
   and the customer portal should again offer **Review proof**
   (old approval history remains, marked superseded on staff side).

### Email check

8. The **Request changes** path should send a
   "Changes requested · Job #<n>" email to `EMAIL_OWNER`. If it
   doesn't arrive, check the browser network tab for the
   `/api/portal/proof-changes-requested` response and the server
   console for a nodemailer error (most commonly SMTP creds or
   missing env).

### Security spot-check

9. From a customer session, open the browser console and try:
   ```js
   await window.__supabase.from('job_items').update({ design_status: 'Design - Approved' }).eq('id', <some id>);
   ```
   (or paste a similar raw update). Should fail with an RLS error —
   the trigger is the ONLY path to that status change.

### Staff regression check

10. Edit an existing job on the staff app (add an item, reorder
    items, change values, save). Existing proof reviews on
    untouched items must survive the save — the `updateJob` path
    was rewritten in this phase to reconcile items by id rather
    than delete+re-insert, which would cascade-wipe review history.

## 4. Known limits (Phase 3+ material)

- Email recipient is a single `EMAIL_OWNER` inbox, not the
  individual staff who created the job.
- The "ready-for-pickup" auto-email is still not wired (Phase 3).
- Multiple concurrent proofs per item are not supported — each
  `job_item` has one current `image_url`. Side-files would need a
  new `job_item_proofs` table.
