# Phase 4 — Reorder, Quote Request, Artwork Locker

Customer-initiated flows. None of them create a billable job directly —
they all land as **pending** items for staff to review, price, and
confirm. Staff stays in control of pricing and capacity.

## Goal

Cut the "call the shop to place an order" friction for repeat customers,
without giving customers the ability to commit the shop to work or
prices.

---

## 4A — Reorder

1. **Entry point**
   - Every row in the order ledger + the job detail page gets a
     "Reorder" button.
   - Only visible when `job_status = 'delivered'` (can't reorder
     something still in flight).

2. **Flow**
   - Customer clicks Reorder → modal shows a copy of all line items
     with editable `quantity` and an optional note.
   - Submit → creates a new `job_orders` row with
     `job_status = 'pending_review'` (new status value),
     `created_by_id = null`, `customer_user_id = auth.uid()`.
   - All line items copied, but `rate`, `discount_pct`, and
     `delivery_date` are **not** carried over — staff sets those.
   - `special_notes` gets `"Reordered by customer from job #{orig_id}"`.

3. **Staff surface**
   - Kanban gets a new "Review" lane at the far left (or a badge on
     pending_review cards if lane churn is undesirable).
   - Staff edits rates + delivery date → moves card forward, which
     promotes `job_status` to `new` and the normal flow resumes.

---

## 4B — Quote request

1. **Portal page**: `app/(portal)/quote/page.tsx`.
2. **Form fields**
   - Product category (dropdown from `products` table).
   - Description (free text).
   - Size, material, specs, finishing (optional).
   - Quantity.
   - Target delivery date (optional).
   - Artwork upload (any number of files, up to 20 MB each).
   - Notes.
3. **Submit behavior** — identical end state to Reorder: creates a
   `job_orders` row with `job_status = 'pending_review'` and one or more
   `job_items` rows. `rate` empty, staff fills in.
4. **Email to staff** — via Phase 3 dispatcher:
   new template `quote-requested.ts`.

---

## 4C — Artwork locker

1. **Schema**
   - New table `customer_artwork`:
     - `id bigserial PK`
     - `customer_user_id uuid not null references customer_profiles(id)`
     - `file_url text not null` (Storage path)
     - `file_name text not null`
     - `mime_type text`
     - `size_bytes bigint`
     - `source text` (`'quote'`, `'upload'`, `'job_item'` — where it
       originated)
     - `source_job_item_id bigint references job_items(id) null`
     - `uploaded_at timestamptz default now()`
   - RLS: customer sees + deletes only own rows.

2. **Auto-capture**
   - Any file uploaded via Quote Request or Proof Review gets a
     `customer_artwork` row.
   - Existing `job_items.image_url` values on the customer's jobs get
     backfilled into `customer_artwork` on first login after Phase 4
     deploys.

3. **Portal page**: `app/(portal)/artwork/page.tsx`.
   - Grid of thumbnails.
   - Per-file actions: Download, Use in quote request (prefills form),
     Delete.
   - Filter by `source`.

---

## Deliverables (combined)

```
app/(portal)/quote/page.tsx                      NEW
app/(portal)/artwork/page.tsx                    NEW
components/portal/reorder-modal.tsx              NEW
components/portal/quote-form.tsx                 NEW
components/portal/artwork-grid.tsx               NEW
lib/db/customer-artwork.ts                       NEW
lib/db/quote-requests.ts                         NEW (thin — mostly job_orders inserts)
lib/email/templates/quote-requested.ts           NEW
types/db.ts                                      EDIT
supabase/migrations/NNNN_pending_review_status.sql   NEW
supabase/migrations/NNNN_customer_artwork.sql    NEW
components/kanban/*                              EDIT (pending_review lane or badge)
```

## Acceptance criteria

- [ ] Reorder creates a pending_review job that staff can see on the
      kanban and promote with a price.
- [ ] Quote requests land as pending_review jobs; uploaded artwork ends
      up in the artwork locker and on the pending job_items.
- [ ] A customer **cannot** set `rate`, `discount_pct`, or any field
      that affects total price (enforced by RLS column-level checks or
      by exposing a narrow RPC instead of direct table writes).
- [ ] Staff receive an email per quote request with a link to the
      pending_review job.
- [ ] Artwork locker lists every file the customer has uploaded + every
      proof on their jobs; deletes are scoped to `source != 'job_item'`
      (can't orphan a staff-attached proof).

## Risks / open decisions

- **Pricing abuse** — most important thing to lock down. Prefer a
  `create_pending_job(...)` RPC that the customer calls, rather than
  direct `job_orders` inserts, so the server controls which columns get
  written.
- **Spam** — someone could flood quote requests. Add a simple rate limit
  (e.g., 3 submits per hour per account) before shipping.
- **Artwork storage cost** — set a per-customer cap (e.g., 500 MB) and
  surface usage on the account page. Defer enforcement if tight on time.
