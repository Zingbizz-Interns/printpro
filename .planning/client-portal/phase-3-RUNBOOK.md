# Phase 3 Runbook — Email Notifications

Code shipped. One migration, one optional env var, then smoke-test in
real inboxes.

## 1. Apply migration 0005 — email_log

Supabase dashboard → **SQL Editor** → paste
`supabase/migrations/0005_email_log.sql` → run.

What it does:

- Creates `public.email_log` (append-only log of every email the
  portal dispatcher attempts to send). Columns: event type,
  debounce key, recipient (nullable when the send failed before
  resolving a recipient), and `error` populated only when the send
  threw. `inserted_by uuid default auth.uid()` captures the JWT
  that triggered the send.
- RLS: any authenticated user can INSERT; SELECT allowed for staff
  (all rows) and for non-staff on their own rows (needed so the
  dispatcher's debounce lookup works under a customer JWT).
  UPDATE / DELETE blocked (log is append-only).
- Indexes `(debounce_key, sent_at desc)` for the 60-second
  debounce lookup plus auxiliary indexes on `customer_user_id` and
  `job_id` for staff history views.

Verify:

```sql
select policyname from pg_policies
  where schemaname='public' and tablename='email_log';
```

## 2. Confirm SMTP + add optional envs

Already configured in Phase 0 (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
`SMTP_PASS`, `SMTP_FROM`, `EMAIL_REPLY_TO`). Phase 2 added
`EMAIL_OWNER` for staff-bound notifications.

Phase 3 adds one optional:

```
SHOP_ADDRESS=123 Example Rd, Bengaluru 560001
```

Used in the `ready-for-pickup` body ("waiting for you at …"). Omit to
hide the address line.

## 3. Smoke-test (end-to-end, ~10 min)

Keep the Supabase dashboard open on a query like:

```sql
select event, to_email, error, sent_at
  from public.email_log order by sent_at desc limit 20;
```

…and a real customer inbox open in a second window.

### Welcome email

1. Sign up a brand-new customer at `/portal/signup`. A row with
   `event='welcome'` should land in `email_log`; the customer inbox
   should receive "Welcome to S Prints" within ~30s.

### Proof-ready email

2. As staff, open a job linked to that customer (set
   `customer_user_id` to their uuid if needed), upload an image on
   one line item, Save. `email_log` should show an `event='proof-ready'`
   row; the customer inbox should receive "Your proof is ready for
   review".
3. Hit Save again without changing the image — no duplicate email
   (debounce on `job_item_id`). If you save again >60s later and the
   image is unchanged, still no email (the client skips if
   `imageUrl` matches what was loaded).

### Proof-approved / changes-requested emails

4. As the customer, open `/portal/orders/<id>`, click **Review proof**,
   **Approve**. `email_log` shows `event='proof-approved'`, going to
   `EMAIL_OWNER`. The shop inbox receives "Approved · Job #…".
5. Upload a new proof for a different item, then as the customer hit
   **Request changes** with a comment. `email_log` shows
   `event='proof-changes-requested'`; shop inbox receives the
   "Changes requested" email with the comment body.

### Ready-for-pickup email

6. As staff, flip every line item's `print_status` to `Ready` so
   `derivedJobStatus` computes `'Ready for Delivery'`. Save.
   `email_log` shows `event='ready-for-pickup'`; customer inbox
   receives "Ready for pickup · Job #…". If a balance is due the
   email includes a highlighted "Balance due on pickup: ₹…" line.
7. Save again (no status change) — no second email.

### Opt-out

8. As the customer, visit `/portal/account/email-preferences`,
   uncheck "Ready for pickup", save.
9. As staff, flip a different job of theirs through to `'Ready for
   Delivery'`. `email_log` records `event='ready-for-pickup'` with
   `error='skipped: opted-out'` (or similar) and no email lands in
   their inbox.

### Fallback for unlinked jobs

10. On a job with `customer_user_id = null` but a valid `email_id`,
    flip to `'Ready for Delivery'`. The email fans out to the raw
    `email_id` value and `email_log.to_email` shows it. This is the
    path for pre-portal customers.

### Deliverability check

11. Spot-check rendering in at least two inboxes: Gmail web +
    Gmail mobile. Outlook web and Apple Mail if time. Look for:
    - subject line isn't truncated awkwardly
    - dark-mode inversion doesn't wreck the buttons
    - the portal link opens cleanly

### Failed-send visibility

12. Temporarily set `SMTP_PASS=wrong` and trigger any event. The
    attempt appears in `email_log` with an `error` column populated.
    Restore the real password before moving on.

## 4. What's wired to what

| Trigger | Event | Recipient |
|---|---|---|
| `/portal/signup` submit | `welcome` | customer |
| Job save: new/different `image_url` on an item | `proof-ready` (one per item) | customer |
| Job save: `jobStatus` → `Ready for Delivery` | `ready-for-pickup` | customer |
| Job save: `jobStatus` → `Delivered` | `delivered` (no-op for v1) | — |
| Proof review insert, `approved` | `proof-approved` | shop inbox |
| Proof review insert, `changes_requested` | `proof-changes-requested` | shop inbox |

All customer-facing events respect `customer_profiles.email_prefs`.
Staff-bound ones (approved / changes-requested) bypass prefs.

## 5. Known limits (Phase 4+ material)

- **`delivered` receipt with invoice PDF attached** — the hook fires
  but the dispatcher currently no-ops. Wiring the PDF generator from
  Phase 1 + attaching to the email is a one-evening follow-up.
- **Per-staff fan-out** — approvals/changes currently go to a single
  shop inbox (`EMAIL_OWNER`). Fan-out to the job's `created_by_id`
  staff member needs either an `email` column on `public.profiles`
  or a service-role lookup into `auth.users`.
- **Daily send-cap monitoring** — `email_log` captures every send; a
  staff-side "emails today" count would be cheap to add but isn't
  done yet.
- **Feedback-request** email triggers in Phase 5.
