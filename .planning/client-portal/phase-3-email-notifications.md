# Phase 3 — Email Notifications

Turn every status flip into a timely email to the customer. No
WhatsApp, no SMS — email only via nodemailer.

## Goal

Customers learn about their job's progress without opening the portal.
Staff don't have to call to say "your job is ready."

## Events that trigger email

| Event | Trigger | Template | To |
|-------|---------|----------|-----|
| Account created | signup → email verified | `welcome.ts` (Phase 0 stub) | customer |
| Proof uploaded | staff uploads `image_url` on a `job_item` | `proof-ready.ts` | customer |
| Design approved (by customer) | `proof_reviews` insert w/ `approved` | `proof-approved.ts` | staff |
| Changes requested | `proof_reviews` insert w/ `changes_requested` | `proof-changes-requested.ts` (from Phase 2) | staff |
| Ready for pickup / delivery | `job_orders.job_status` → `ready` | `ready-for-pickup.ts` | customer |
| Delivered + paid | `job_orders.job_status` → `delivered` | `delivered-receipt.ts` (with invoice PDF attached) | customer |
| Feedback request | 1 hour after `delivered` status | `feedback-request.ts` | customer |

Only the **customer-facing** ones and the **ready-for-pickup** one were
explicitly requested. The others are the minimal set that make the
portal feel alive — treat the optional rows as stretch and cut if time
presses.

## Deliverables

1. **Event plumbing**
   - Two options — pick one:
     - **(A) Postgres triggers + `pg_net`** to call a Next.js API route
       on status changes. Clean, DB-authoritative, but requires Supabase
       extensions.
     - **(B) App-layer dispatch** — every mutation in `lib/db/jobs.ts`
       that flips status calls `dispatchEvent(...)` which enqueues an
       email. Simpler to debug, but misses direct-SQL changes.
   - **Recommendation: B** for v1. Staff-side mutations already go
     through `lib/db/*.ts`. Revisit if we find drift.

2. **Email dispatcher**
   - `lib/email/dispatch.ts` — central event → template map.
   - Signature: `dispatch(event: PortalEvent, ctx)` where `PortalEvent`
     is a union of the events above. Keeps all "what fires on X" logic
     in one place.
   - Retry: on nodemailer failure, log to `email_log` table and surface
     to an admin page (stretch — fine to just log to console for v1).

3. **Templates**
   - One file per template in `lib/email/templates/`.
   - Shared layout component (header with logo, footer with shop
     address) — keep minimal, no external CSS.
   - All templates take a typed `data` param; no string-concat
     interpolation with user input without escaping.

4. **Unsubscribe / preferences** (light version)
   - `customer_profiles.email_prefs jsonb default '{}'` — keys per event
     type, booleans.
   - Transactional emails (invoice, ready-for-pickup) ignore prefs;
     feedback and marketing-ish emails respect them.
   - Simple page: `/account/email-preferences` with checkboxes.

5. **Env**
   - `SMTP_*` env already added in Phase 0 (Gmail SMTP).
   - Add `EMAIL_REPLY_TO` (can point to the shop's main inbox so
     customer replies reach staff — the `SMTP_FROM` Gmail account is
     unattended).

## Files touched / added

```
lib/email/dispatch.ts                            NEW
lib/email/templates/proof-ready.ts               NEW
lib/email/templates/proof-approved.ts            NEW
lib/email/templates/ready-for-pickup.ts          NEW
lib/email/templates/delivered-receipt.ts         NEW
lib/email/templates/feedback-request.ts          NEW (used in Phase 5)
lib/email/layout.tsx                             NEW
lib/db/jobs.ts                                   EDIT  (call dispatch on status changes)
lib/db/proof-reviews.ts                          EDIT  (call dispatch on insert)
app/(portal)/account/email-preferences/page.tsx  NEW
types/db.ts                                      EDIT  (email_prefs column)
supabase/migrations/NNNN_email_prefs.sql         NEW
```

## Acceptance criteria

- [ ] Staff flipping a job to `ready` sends the customer a
      "Ready for pickup" email within 30 seconds, with the right job
      number, items summary, and pickup address.
- [ ] Email templates render correctly in Gmail (web + mobile), Outlook
      web, and Apple Mail. Spot-check via Litmus or real inboxes.
- [ ] Failed sends are logged, not silently dropped.
- [ ] Customer can opt out of feedback emails via
      `/account/email-preferences` — transactional emails still send.
- [ ] No email contains secrets, staff-only notes, or another customer's
      data (verified via template review).

## Risks / open decisions

- **Deliverability (Gmail SMTP)** — we're sending from a real Gmail
  account, so SPF/DKIM are handled by Google and we can't configure
  DMARC for our own domain. Some corporate spam filters still downgrade
  `@gmail.com` senders for transactional mail; acceptable for v1. If
  delivery complaints surface (customers saying "didn't get the pickup
  email"), that's the signal to move to Resend / SES.
- **Daily send cap** — ~500/day (free Gmail) or ~2,000/day (Workspace).
  At current shop volume we're well under, but the dispatcher should
  log send counts daily so we notice before hitting the ceiling.
- **Duplicate sends** — if a status flips twice quickly (e.g., staff
  undo), we don't want two emails. Debounce at dispatch level: skip if
  same `(event, job_id, customer_id)` was sent in last 60 seconds.
- **Email as source of truth for "was customer notified"** — we'll log
  `(customer_id, event, sent_at)` in `email_log` so staff can see when a
  notification went out, from the staff job detail page.
