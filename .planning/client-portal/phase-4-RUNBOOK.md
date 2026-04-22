# Phase 4 Runbook — Reorder, Quote, Artwork Locker

Code shipped. One migration, then smoke-test in a browser.

## 1. Apply migration 0006

Supabase dashboard → **SQL Editor** → paste
`supabase/migrations/0006_reorder_quote_artwork.sql` → run.

What it does:

- Documents `'Pending Review'` as a new `job_status` value (the
  column is plain text, so the TypeScript enum is the source of
  truth; the migration just drops a comment).
- Creates `public.customer_artwork` + RLS (customer can SELECT own
  rows, DELETE own rows; staff can INSERT, SELECT all, DELETE all).
  Customer INSERTs happen through the `add_customer_artwork(...)`
  RPC so `customer_user_id` is always `auth.uid()`.
- Adds three SECURITY DEFINER functions:
  - `create_pending_job(p_items, p_notes, p_source, p_original_job_id, p_delivery_date)`
    — the **only** path a customer can create a job. Pins `rate=0`,
    `discount_pct=0`, `created_by=''`, `created_by_id=null`,
    `job_status='Pending Review'`, `customer_user_id=auth.uid()`,
    and sets `email_id` / `company_name` / `contact_person` /
    `gst_no` / `customer_address` from the customer profile. Uses
    `pg_advisory_xact_lock` to serialize `job_no` allocation.
  - `add_customer_artwork(...)` — the only write path into
    `customer_artwork`.
  - `customer_recent_pending_job_count()` — helper.
- Rate limit: a customer with 3 currently-`Pending Review` jobs
  cannot submit a 4th — they have to wait for staff to price (and
  move) one. This is a queue-depth cap, not a per-hour cap.
- Adds `customer_artwork` to the `supabase_realtime` publication so
  the locker stays live.

Verify:

```sql
-- RPCs present:
select proname from pg_proc
  where proname in ('create_pending_job', 'add_customer_artwork',
                    'customer_recent_pending_job_count');

-- Policies:
select policyname, cmd from pg_policies
  where schemaname='public' and tablename='customer_artwork';

-- Publication:
select tablename from pg_publication_tables
  where pubname='supabase_realtime' and tablename='customer_artwork';
```

## 2. Smoke-test (~15 min)

### Reorder

1. As staff, ensure the test customer has at least one job that is
   `Delivered`. (Flip every item's `print_status` to `Delivered`
   via the job form; the form derives `job_status='Delivered'`.)
2. Sign into the portal as the customer. Open `/portal/orders` — the
   delivered row shows a **Reorder** button on desktop and in the
   mobile list.
3. Click Reorder → modal lists every line item with an editable
   quantity. Tick/untick a couple, change a qty, add a note.
4. Submit → redirects to `/portal/orders/<new-id>`. The new job
   appears with status **Pending Review**, no rate, and
   `special_notes` starting with `Reordered by customer from job #…`.
5. Switch to the staff app → `/kanban`. The new job shows a
   sky-blue "⏳ Pending" status pill and floats to the top when the
   sort is "urgency". The stats strip shows "⏳ Pending N".
6. Staff sets rates + delivery date in the job form, saves. The
   card's status auto-derives forward (`Design - Not yet Started`
   → onwards) and the pending badge disappears.

### Quote request

7. As customer, open **/portal/quote**. Fill out category (dropdown
   comes from `products`), description, quantity. Add a second line
   via "Add another item". Set a target delivery date. Attach one or
   two files (PDF, image, etc.) under 20 MB each.
8. Submit → redirects to the new pending job. On the staff side:
   - the kanban card appears with "⏳ Pending"
   - the shop inbox (`EMAIL_OWNER` / `EMAIL_REPLY_TO`) receives
     "Quote request · Job #…" with the item list, delivery date
     (if set), and the customer's notes (the server-prepended
     "Quote request from portal." prefix is stripped from the
     email body)
   - `email_log` records the `quote-requested` event
9. Open `/portal/artwork` as the customer — the files uploaded in
   the quote form appear under "Your uploads" with source `quote`.

### Rate-limit

10. Without staff clearing any of them, submit 3 more quote
    requests back-to-back as the same customer. The 4th attempt
    surfaces the friendly error "you already have 3 pending
    requests — please wait for staff to review one". Staff can
    unblock by pricing any one of the pending jobs (which moves it
    out of `Pending Review`).

### Artwork locker

11. On `/portal/artwork`, click **Upload files** and pick a PDF. It
    appears instantly under "Your uploads" with source `upload`.
12. Filter tabs (`All`, `Uploads`, `Quote attachments`, `Reorder
    attachments`, `Staff proofs`) narrow the grid as expected.
13. Click **Open** on an uploaded row → a signed URL opens in a new
    tab. Click **Delete** → confirm → the row disappears (the
    underlying storage object stays; staff can clean up if needed).
14. The "Staff proofs" tab lists every `job_items.image_url` on the
    customer's jobs. These are **not** deletable — no delete button
    is rendered — so the customer can't orphan a proof staff
    uploaded.

### Security spot-checks

15. From a customer browser console, try to forge a high-value job:
    ```js
    await window.__supabase
      .from('job_orders')
      .insert({ job_no: 99999, company_name: 'X', customer_user_id: '<your uuid>', job_status: 'Ready for Delivery' });
    ```
    Expected: RLS rejects (direct INSERT on `job_orders` is
    staff-only from Phase 0).
16. Try to mutate a pending job's rate:
    ```js
    await window.__supabase.from('job_items').update({ rate: 1 }).eq('id', <their item id>);
    ```
    Expected: RLS rejects (UPDATE on `job_items` is staff-only).

## 3. What's wired to what

| Trigger | Creates | Recipient of email |
|---|---|---|
| Customer clicks "Reorder" on a delivered job | New Pending Review job via `create_pending_job(... source='reorder')` | — (no email; staff see it on the kanban) |
| Customer submits `/portal/quote` | New Pending Review job + artwork rows | shop inbox (`quote-requested` template) |
| Customer uploads in `/portal/artwork` | `customer_artwork` row (source=`upload`) | — |
| Staff moves job off Pending Review | `job_status` advances per normal flow | whatever Phase 3 already dispatches |

## 4. Known limits

- No artwork-storage cap — the plan mentioned 500 MB per customer
  but it's not enforced yet. If storage bills spike, add a check
  inside `add_customer_artwork(...)` that sums `size_bytes` for
  the caller and raises.
- Artwork delete now removes both the DB row and the Storage
  object (`customer-documents/{uuid}/artwork/...`). If the storage
  remove fails (e.g. the object was already gone), the DB delete
  still proceeds — stale file < orphaned row pointing at a deleted
  blob.
- Phase 4's "pending_review lane" in the plan was downgraded to
  a badge + stats chip + urgency-sort boost. Adding a dedicated
  lane would require restructuring `kanban-board.tsx` into a
  multi-column layout; the current single-grid design doesn't
  separate by status. Defer unless staff request it.
