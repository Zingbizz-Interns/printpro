# Phase 5 — Post-Delivery Feedback + Rating

Close the loop. Capture how the customer felt about the job once it's
delivered, so the owner can spot problems and showcase wins.

## Goal

After a job goes `delivered`, the customer gets an email asking for a
rating + comment. Responses surface on the owner dashboard.

## Deliverables

1. **Schema**
   - New table `job_feedback`:
     - `id bigserial PK`
     - `job_order_id bigint not null unique references job_orders(id) on delete cascade`
     - `customer_user_id uuid not null references customer_profiles(id)`
     - `rating smallint not null check (rating between 1 and 5)`
     - `comment text`
     - `would_recommend boolean`
     - `created_at timestamptz default now()`
   - `unique (job_order_id)` — one feedback per job, editable for 14
     days then locked.
   - RLS: customer can `insert`/`select`/`update` (within 14 days) own
     rows; staff + owner can read all.

2. **Trigger**
   - When `job_orders.job_status` flips to `delivered`, schedule a
     `feedback-request` email 1 hour later (simple approach: a
     `pending_emails` row with `send_after` timestamp, consumed by a
     cron route `/api/cron/send-scheduled-emails` hit every 5 min by
     Vercel Cron or Supabase scheduled edge function).
   - Email contains a deep link with a one-time token (or just the
     logged-in `/orders/{id}/feedback` route — tokens are only needed if
     we want to let non-registered customers rate).

3. **Portal UI**
   - `app/(portal)/orders/[id]/feedback/page.tsx` — 5-star widget,
     comment textarea, "Would you recommend us?" yes/no.
   - After submit: "Thanks!" state, with option to edit within 14 days.
   - Job detail page shows the customer's own feedback inline.

4. **Owner dashboard surface**
   - New tile on `/dashboard`: "Feedback" — average rating over last
     30/90 days, count of responses, trend sparkline.
   - New page `/dashboard/feedback` — paginated list of feedback
     entries with rating, comment, job #, customer name, and a filter
     for rating ≤ 3 (the ones that need follow-up).

5. **Light moderation**
   - No customer-facing display of other customers' feedback in v1
     (keeps us out of public-reviews territory). Owner-only view.

## Files touched / added

```
app/(portal)/orders/[id]/feedback/page.tsx        NEW
app/(app)/dashboard/feedback/page.tsx             NEW
components/portal/star-rating.tsx                 NEW
components/dashboard/feedback-widget.tsx          NEW
lib/db/feedback.ts                                NEW
lib/email/templates/feedback-request.ts           EDIT (created stub in Phase 3)
app/api/cron/send-scheduled-emails/route.ts       NEW
supabase/migrations/NNNN_job_feedback.sql         NEW
supabase/migrations/NNNN_pending_emails.sql       NEW
```

## Acceptance criteria

- [ ] A job flipping to `delivered` causes a feedback-request email to
      land in the customer's inbox ~1 hour later.
- [ ] Submitting feedback creates a `job_feedback` row; the customer
      can edit within 14 days and cannot delete.
- [ ] Owner dashboard shows accurate average rating and response count;
      low-rating items are surfaced as a filter.
- [ ] Email opt-out (from Phase 3 prefs) suppresses the feedback email;
      customer can still rate via the portal.

## Risks / open decisions

- **Response rates** — realistically 10–20%. Don't over-engineer
  reminders. Send once. If the owner wants more, add a single follow-up
  at day 3.
- **Scheduled email infrastructure** — the `pending_emails` + cron
  route is the simplest v1. Revisit with a proper queue (Inngest,
  Trigger.dev, or Supabase Edge Functions + pg_cron) once we have more
  scheduled events.
- **Public display** — not planned. If the owner later wants Google
  Reviews-style public badges, that's a separate effort.
