# Phase 5 Runbook — Post-Delivery Feedback + Rating

Code shipped. One migration, two new env vars, wire up a cron trigger,
then smoke-test end-to-end.

## 1. Apply migration 0007

Supabase dashboard → **SQL Editor** → paste
`supabase/migrations/0007_feedback_and_scheduled_emails.sql` → run.

What it does:

- Creates `public.job_feedback` (one rating per `job_order_id`, editable
  by the customer for **14 days** from `created_at`). RLS: customer
  SELECT/INSERT/UPDATE own; staff SELECT all. DELETE blocked — the row
  is an audit event. A `touch_job_feedback_updated_at` trigger refreshes
  `updated_at` on edits.
- Creates `public.pending_emails` — the queue of scheduled portal
  emails. For v1 only `feedback-request` uses it. No auth policy for
  customers (service-role bypasses RLS; authenticated-staff can
  SELECT).
- Adds trigger `job_orders_enqueue_feedback_request` on
  `AFTER UPDATE OF job_status`. When `job_status` newly flips to
  `'Delivered'` AND the job has a `customer_user_id`, it enqueues a
  `feedback-request` row with `send_after = now() + 1 hour`.
  `on conflict do nothing` on the partial unique index means cycling
  a job in-and-out of Delivered doesn't double-enqueue.
- Adds `job_feedback` to the `supabase_realtime` publication so the
  owner dashboard sees new ratings live.

Verify:

```sql
-- Table + policies:
select policyname, cmd from pg_policies
  where schemaname='public' and tablename='job_feedback';

-- Trigger:
select tgname from pg_trigger
  where tgname = 'job_orders_enqueue_feedback_request';

-- Queue unique index:
select indexname from pg_indexes
  where schemaname='public' and tablename='pending_emails';

-- Realtime:
select tablename from pg_publication_tables
  where pubname='supabase_realtime' and tablename='job_feedback';
```

**Note on historical jobs:** the enqueue trigger is `AFTER UPDATE` only,
so jobs that were already `Delivered` before the migration applied do
**not** get feedback-request emails retroactively. This is the desired
behavior — we don't want to blast every past customer the moment 0007
ships.

## 2. Env vars

Add to `.env.local` (and to the hosting platform's secrets):

```
SUPABASE_SERVICE_ROLE_KEY=<service role key from Supabase project settings>
CRON_SECRET=<random 32+ char string; any good password generator is fine>
```

- **`SUPABASE_SERVICE_ROLE_KEY`** — the cron route creates a
  service-role Supabase client to bypass RLS. Never expose this on the
  client; it only lives in the route handler.
- **`CRON_SECRET`** — incoming cron requests must carry
  `Authorization: Bearer <CRON_SECRET>` or the route 401s. Rotate this
  if leaked.

No new templates-env is needed; the existing `SMTP_*` / `SHOP_ADDRESS`
values from Phase 0 / Phase 3 are reused.

## 3. Wire up the cron trigger

Pick one of the following. The route handles **GET** and **POST**
identically so it works with any scheduler.

### Option A — Vercel Cron (recommended)

In `vercel.json` (create if missing):

```json
{
  "crons": [
    {
      "path": "/api/cron/send-scheduled-emails",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

Vercel Cron automatically sends `Authorization: Bearer <CRON_SECRET>`
when `CRON_SECRET` is set as an env var in the project. Nothing else
to configure.

### Option B — Supabase scheduled function / pg_cron

From the Supabase SQL editor:

```sql
select cron.schedule(
  'drain-pending-emails',
  '*/5 * * * *',
  $$ select net.http_post(
       url := 'https://<your-domain>/api/cron/send-scheduled-emails',
       headers := jsonb_build_object(
         'Authorization', 'Bearer <CRON_SECRET value>',
         'Content-Type', 'application/json'
       ),
       body := '{}'::jsonb
  ); $$
);
```

### Option C — external ping (UptimeRobot, cron-job.org, etc.)

Hit `https://<your-domain>/api/cron/send-scheduled-emails` every 5 min
with `Authorization: Bearer <CRON_SECRET>`.

**Race-condition note:** the drain does
`select ... where sent_at is null` then `update sent_at`. If two crons
ever fire concurrently, a row could be sent twice. With a single
5-minute cron this is vanishingly unlikely; **don't run two schedulers
against the same endpoint simultaneously**. If you ever need higher
throughput, switch to an atomic claim (`update ... returning *`) —
not worth the complexity at this scale.

## 4. Smoke-test (~15 min)

Open the Supabase dashboard on a scratch query:

```sql
select id, event_type, job_order_id, send_after, sent_at, attempts, last_error
  from public.pending_emails order by id desc limit 20;

select id, job_order_id, rating, would_recommend, created_at
  from public.job_feedback order by id desc limit 20;

select event, to_email, error, sent_at from public.email_log
  where event like 'feedback%' order by sent_at desc limit 20;
```

### Enqueue a feedback request

1. As staff, pick a test customer's job with at least one line item
   and a non-null `customer_user_id`. Flip every item's
   `print_status` to `Delivered` so `derivedJobStatus` computes
   `'Delivered'`, save.
2. A row appears in `pending_emails` with `event_type='feedback-request'`,
   `send_after` ≈ now + 1h, `sent_at = null`.
3. To skip the 1-hour wait, manually nudge `send_after` into the past:
   ```sql
   update public.pending_emails
     set send_after = now() - interval '1 minute'
     where event_type='feedback-request' and sent_at is null;
   ```

### Drain the queue

4. Trigger the cron manually:
   ```bash
   curl -i -H "Authorization: Bearer $CRON_SECRET" \
     https://<your-domain>/api/cron/send-scheduled-emails
   ```
   Response: `{ ok: true, considered: N, sent: M, skipped: K, failed: 0 }`.
5. The customer inbox receives **"How did we do with job #…?"** with
   a "Rate this job" button that deep-links to
   `/portal/orders/<id>/feedback`.
6. `pending_emails.sent_at` is now populated. `email_log` has a
   `feedback-request` row with the customer email in `to_email`.

### Submit feedback

7. As the customer, click the email link or visit
   `/portal/orders/<id>/feedback` directly. Pick a rating (1-5),
   optionally add a comment and select a recommend yes/no. Submit.
8. `job_feedback` gets a new row. The page flips to the "Your rating"
   state with an "Edit feedback" affordance.
9. Back on `/portal/orders/<id>`, a card at the bottom shows the
   stars inline with an "Edit feedback" link (while within 14 days).

### Edit + 14-day lock

10. Within 14 days, the page renders the editable form pre-filled
    with the current rating / comment / recommend. Updating changes
    `updated_at` (and the row via the `touch_job_feedback_updated_at`
    trigger).
11. To verify the lock, simulate a closed window:
    ```sql
    update public.job_feedback
      set created_at = now() - interval '15 days'
      where id = <feedback id>;
    ```
    Reload the page → it now shows the read-only summary without an
    Edit button. Trying to UPDATE the row directly via the JS client
    returns 0 rows affected (RLS silently rejects).

### Opt-out

12. As the customer, uncheck **"Feedback request"** on
    `/portal/account/email-preferences`, save.
13. As staff, flip another of their jobs to `'Delivered'`. A new
    `pending_emails` row appears (the trigger still runs — the pref
    is checked at **send time**, not enqueue time).
14. Manually move `send_after` into the past and hit the cron again.
    `pending_emails.sent_at` gets stamped, but `email_log.error` is
    `'skipped: opted-out'` and no email lands. The customer can still
    submit feedback via the portal — acceptance criterion 4.

### Already-rated short-circuit

15. If feedback already exists for a job and the cron is triggered
    (e.g. a duplicate queue row), the dispatcher logs
    `'skipped: feedback already submitted'` and stamps `sent_at` so
    the row isn't re-picked.

### Owner dashboard

16. As owner, visit `/dashboard` → a "Customer Feedback" section at the
    bottom shows Last-30 / All-time average rating + response count and
    the three most recent ratings.
17. Click **See all** → `/dashboard/feedback`. Table lists every row
    with rating stars, comment, recommend, job # (linked), customer
    name and submitted date. The "≤ 3 (needs follow-up)" filter chip
    narrows the list to low ratings; paged at 25 per page.
18. Staff accounts (non-owner) hitting `/dashboard/feedback` get
    redirected to `/kanban` (same `isOwner` guard as `/dashboard`).

### Security spot-checks

19. From a customer browser console, try to forge a 5★ rating for
    someone else's job:
    ```js
    await window.__supabase
      .from('job_feedback')
      .insert({ job_order_id: <someone else's>, customer_user_id: '<your uuid>', rating: 5 });
    ```
    Expected: RLS rejects (INSERT policy verifies `job_orders.customer_user_id = auth.uid()`).
20. Try to forge a rating on a non-delivered job of your own:
    ```js
    await window.__supabase
      .from('job_feedback')
      .insert({ job_order_id: <your in-progress job>, customer_user_id: '<your uuid>', rating: 5 });
    ```
    Expected: RLS rejects (requires `job_status = 'Delivered'`).
21. Try to pass the 14-day window by UPDATE:
    ```js
    await window.__supabase
      .from('job_feedback')
      .update({ rating: 1 })
      .eq('id', <old feedback id with created_at > 14 days ago>);
    ```
    Expected: 0 rows affected (RLS UPDATE policy enforces the window).
22. Hit the cron endpoint without the bearer:
    ```bash
    curl -i https://<your-domain>/api/cron/send-scheduled-emails
    ```
    Expected: 401.

## 5. What's wired to what

| Trigger | Creates | Recipient of email |
|---|---|---|
| Staff flips `job_status` → `'Delivered'` | `pending_emails` row (event=feedback-request, send_after=+1h) | — (queued) |
| Cron drain (every 5 min) | sends `feedback-request` email if due, not opted out, not already rated | customer |
| Customer submits `/portal/orders/<id>/feedback` | `job_feedback` row | — |
| Customer edits feedback within 14 days | updates `job_feedback` row | — |

All customer-facing events respect `customer_profiles.email_prefs`.
The portal feedback page itself works regardless of opt-out state.

## 6. Known limits / follow-ups

- **No reminder email** — one send, one shot. Response rates for this
  kind of ping realistically land at 10-20%. If the owner wants more,
  add a second `pending_emails` insert at `now() + 72h` with event
  `feedback-reminder` (plus a template and short-circuit if feedback
  already exists).
- **No service-role key pooling** — the cron route creates a client per
  request. For 5-minute poll cadence this is fine; if we ever hit the
  route hard, move the client into a module-level singleton.
- **Max 5 attempts** — if SMTP fails 5 times for the same row, the
  dispatcher gives up (prevents queue loops). To retry a dead row,
  clear its `attempts` and `last_error`.
- **No feedback-reminder or feedback-received receipt** — both are
  future stretch. The customer-side "Thanks!" tick is enough for v1.
- **Public display** — intentionally not built. Owner-only view keeps
  us out of public-reviews territory.
- **Cron race condition** — noted above; don't run two schedulers
  against the same endpoint.
- **Opt-out is evaluated at send-time, terminally** — the
  `pending_emails` row gets `sent_at` stamped the first time the cron
  drains it, even if the send was skipped because the customer was
  opted out. Opting back in later will **not** retroactively cause that
  specific feedback-request email to fire. This is intentional — we
  don't want an opt-out to leave rows churning in the queue forever —
  but worth flagging if a customer asks "I re-enabled feedback emails,
  why didn't the one for job #N arrive?". They can still rate the job
  via the portal at any time within 14 days.
