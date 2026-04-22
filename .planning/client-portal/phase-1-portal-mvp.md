# Phase 1 — Portal MVP (read-only)

Ship the smallest thing the customer finds useful. No writes except
profile edits. No staff workflow changes.

## Goal

A signed-in customer can see every job they've placed, its live status,
delivery info, payment state, download an invoice PDF, and manage their
GST certificate / billing address.

## Deliverables

1. **Portal dashboard** (`app/(portal)/page.tsx`)
   - Active jobs (not yet delivered) shown as cards with status pill,
     delivery date, outstanding balance.
   - "Open job" link → job detail page.
   - Empty state: "No active orders — contact shop to place one."

2. **Order ledger** (`app/(portal)/orders/page.tsx`)
   - Paginated table of all jobs (active + completed).
   - Columns: Job #, Date, Items summary, Total, Paid, Balance, Status.
   - Filters: status, paid/outstanding, date range.
   - Reuse `lib/domain/totals.ts` — do not reinvent GST/discount math.

3. **Job detail** (`app/(portal)/orders/[id]/page.tsx`)
   - Header: job #, order date, delivery date + time, status pill.
   - Line items table (read-only): category, description, qty, rate,
     per-item design/print status (visual only in this phase — approval
     comes in Phase 2).
   - Totals block (subtotal, discount, GST, round-off, grand total).
   - Payment block: advance, balance, every `partial_payments` row.
   - "Download invoice" button → PDF.

4. **Live status** — Subscribe to Supabase realtime for the customer's
   `job_orders` + `job_items` rows on the dashboard + job detail pages.
   Reuse the existing `lib/realtime.ts` pattern, scoped by
   `customer_user_id`.

5. **Invoice PDF (client-side, as shipped)**
   - Uses `@react-pdf/renderer` with **client-side** PDF generation via
     a download button that dynamic-imports the renderer on click — no
     server route, no server-session-aware Supabase client needed.
   - Template is `lib/pdf/invoice.tsx`; download button is
     `components/portal/download-invoice-button.tsx`.
   - Data source is the persisted `Job` object (frozen customer fields
     on `job_orders`). `customer_profiles` is deliberately NOT used —
     profile edits must not retroactively rewrite historical invoices.

6. **Account settings** (`app/(portal)/account/page.tsx`)
   - Edit name, contact number, billing address, GST number.
   - Upload GST certificate → Supabase Storage bucket
     `customer-documents`, path `{customer_user_id}/gst-cert.{ext}`.
   - View currently uploaded certificate with a re-upload action.
   - Change password (Supabase Auth).

7. **Portal nav**
   - Top bar: logo, "Orders", "Account", logout.
   - Mobile: bottom nav mirroring the same.

## Files touched / added

```
app/portal/page.tsx                                   EDIT (replaced stub with dashboard)
app/portal/orders/page.tsx                            NEW
app/portal/orders/[id]/page.tsx                       NEW
app/portal/account/page.tsx                           NEW
app/portal/layout.tsx                                 EDIT (uses portal nav)
components/portal/portal-nav.tsx                      NEW (topbar + bottom nav)
components/portal/status-pill.tsx                     NEW
components/portal/order-card.tsx                      NEW
components/portal/download-invoice-button.tsx         NEW
lib/db/portal-orders.ts                               NEW (RLS-safe customer reads)
lib/db/customer-profiles.ts                           NEW
lib/db/storage.ts                                     EDIT (customer-documents helpers)
lib/realtime-portal.ts                                NEW (portal-scoped realtime hook)
lib/pdf/invoice.tsx                                   NEW (@react-pdf/renderer template)
supabase/migrations/0002_customer_documents_bucket.sql   NEW
supabase/migrations/0003_realtime_publication.sql        NEW (prerequisite for live-sync; affects staff too)
```

# Not built (originally in plan, deliberately skipped):
#   app/portal/orders/[id]/invoice/route.ts  — replaced by client-side PDF

## Acceptance criteria

- [ ] A logged-in customer sees only their own jobs on every portal page.
- [ ] Job status updates made by staff on the kanban appear on the
      customer's dashboard **without refresh** (realtime).
- [ ] Invoice PDF downloads, opens in Acrobat/Preview, and totals match
      the staff-side job view to the rupee.
- [ ] GST certificate upload round-trips: upload → visible on next page
      load → replaceable.
- [ ] No portal page references `refference/` or leaks staff-only data
      (staff names, internal notes, etc.). `special_notes` stays hidden.

## Risks / open decisions

- **Which `special_notes` / `remarks` to expose?** Default: hide both in
  the portal. They're staff-internal. Revisit if customers ask.
- **Invoice PDF styling fidelity** — sign-off from the owner on a sample
  render before calling this phase done. Plan half a day for iteration.
- **Realtime cost** — one channel per active customer session is fine at
  current scale. Revisit if concurrent sessions grow > 100.
