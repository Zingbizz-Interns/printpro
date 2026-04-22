# Phase 2 — Proof Approval

The single biggest staff-time saver. Lets customers approve or request
changes on design proofs without a phone call.

## Goal

For every `job_item` with an uploaded `image_url`, the customer can:
- View the proof at full size.
- **Approve** → flips `design_status` to `approved`.
- **Request changes** → keeps status as `pending_approval`, stores a
  comment, emails staff.

## Deliverables

1. **Schema**
   - New table `proof_reviews`:
     - `id bigserial PK`
     - `job_item_id bigint not null references job_items(id) on delete cascade`
     - `customer_user_id uuid not null references customer_profiles(id)`
     - `decision text check (decision in ('approved', 'changes_requested'))`
     - `comment text`
     - `created_at timestamptz default now()`
   - Index: `(job_item_id, created_at desc)`.
   - RLS: customer can insert/select own rows (matched by
     `customer_user_id = auth.uid()`); staff can read all.

2. **Status machine**
   - `design_status` values (existing): extend if needed to include a
     clean `pending_approval` state. Verify current values in
     `types/db.ts` before migrating.
   - On `proof_reviews.insert`:
     - `decision = 'approved'` → DB trigger sets `job_items.design_status
       = 'approved'`.
     - `decision = 'changes_requested'` → status stays; `updated_at`
       bumped so staff kanban re-sorts.
   - Prefer a Postgres trigger over app-layer writes so the customer
     cannot forge a status change by writing directly to `job_items`.

3. **Portal UI — job detail page**
   - Each line item with `image_url` gets a "Review proof" button.
   - Modal: full-size image (use existing `react-easy-crop`-free viewer
     or a lightbox), Approve / Request changes buttons, comment textarea
     (required for "Request changes").
   - After submit: line item shows "✓ Approved on {date}" or
     "⟳ Changes requested: '{comment}'" with a "Revise request" action
     until staff re-uploads.
   - If multiple proofs are revised and re-uploaded, show review
     history (most recent first).

4. **Staff-side surfacing**
   - Staff kanban card gains a small badge: "Awaiting approval",
     "Changes requested (N)", or "Approved".
   - Job detail page (`app/(app)/jobs/[id]`) shows the latest review +
     comment inline with each item.

5. **Email on request-changes** (dependency on Phase 3's transport, but
   OK to send eagerly — `lib/email/send.ts` exists from Phase 0).
   - Template: `proof-changes-requested.ts`.
   - To: shop owner + `created_by` staff email (look up from
     `profiles`).
   - Body: customer name, job #, item description, comment, link to
     staff job detail page.

## Files touched / added

```
app/(portal)/orders/[id]/page.tsx                    EDIT  (proof buttons + modal)
components/portal/proof-review-modal.tsx             NEW
lib/db/proof-reviews.ts                              NEW
lib/email/templates/proof-changes-requested.ts       NEW
types/db.ts                                          EDIT
components/kanban/job-card.tsx                       EDIT  (add badge)
app/(app)/jobs/[id]/...                              EDIT  (show review history)
supabase/migrations/NNNN_proof_reviews.sql           NEW
```

## Acceptance criteria

- [ ] Customer approving a proof flips `design_status` to `approved`
      and the staff kanban reflects it within realtime latency.
- [ ] Customer requesting changes does NOT mutate `design_status`, but
      creates a `proof_reviews` row and triggers an email to staff.
- [ ] A customer cannot write to `job_items` directly (confirmed by
      attempting a raw Supabase update from a customer session — should
      be rejected by RLS).
- [ ] Review history is visible on the staff-side job detail view.
- [ ] Items without `image_url` show a disabled "Proof not yet
      uploaded" state, not a broken button.

## Risks / open decisions

- **`design_status` enum values** — confirm the current set before
  migration; may need a widening migration.
- **Revised proofs** — when staff re-uploads `image_url`, the old
  review shouldn't silently carry over. Decision: a new upload resets
  `design_status` to `pending_approval` and the UI treats any prior
  `proof_reviews` as historical. Implement via trigger on
  `job_items.image_url` change.
- **Multi-proof per item** — not planned. If the shop sends revisions
  as side-files, we'll need `job_item_proofs` later. Out of scope now.
