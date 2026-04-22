# Client Portal — Phased Plan

A customer-facing portal that sits alongside the existing staff app and
reuses the same Supabase backend. Scoped to what the owner approved on
2026-04-22.

## In scope

- Email + password auth (customer accounts, separate from staff)
- Live job status (read-only kanban/timeline per customer)
- Proof approval per job item (approve / request changes + comment)
- Order ledger (all past jobs, totals, paid/outstanding)
- Invoice / receipt PDF download
- Balance-due view (display only — no online payment)
- Payment history per job
- Reorder from past jobs
- Quote request form (lands as pending job for staff triage)
- Artwork locker (all uploaded files, reusable)
- Delivery date + time slot visible
- "Ready for pickup" email trigger on status flip
- GST certificate + billing address on file
- Feedback + rating after delivery
- Email notifications via **nodemailer** (no WhatsApp, no SMS)

## Explicitly out of scope

- Online payments (Razorpay / Stripe / UPI) — balance shown, not paid online
- WhatsApp / SMS notifications
- Multi-contact per company (single customer user for now)
- Magic-link / OTP auth

## Phases

| Phase | Theme | Doc |
|-------|-------|-----|
| 0 | Foundations — schema, RLS, portal route group, customer auth, nodemailer | [phase-0-foundations.md](phase-0-foundations.md) |
| 1 | Portal MVP — login, ledger, live status, delivery info, invoice PDF, GST cert | [phase-1-portal-mvp.md](phase-1-portal-mvp.md) |
| 2 | Proof approval — per-item approve/request-changes, drives `design_status` | [phase-2-proof-approval.md](phase-2-proof-approval.md) |
| 3 | Email notifications — ready-for-pickup + proof-request emails | [phase-3-email-notifications.md](phase-3-email-notifications.md) |
| 4 | Reorder + Quote request + Artwork locker | [phase-4-reorder-quote-artwork.md](phase-4-reorder-quote-artwork.md) |
| 5 | Post-delivery feedback + rating | [phase-5-feedback.md](phase-5-feedback.md) |

Phases 0 → 3 are the critical path (cuts staff follow-up time immediately).
Phases 4 and 5 are opt-in once the MVP is stable.

## Cross-cutting constraints

- **Next.js 16** — per `AGENTS.md`, conventions differ from prior majors.
  Verify APIs against `node_modules/next/dist/docs/` before writing code.
- **Portal URL space**: all portal routes live under the real segment
  `app/portal/*` (URLs: `/portal`, `/portal/orders`, `/portal/signup`,
  ...). **Login is unified** at `/login` — one page routes staff to
  `/kanban` (or `/dashboard` for owners) and customers to `/portal`
  based on which profile table has the user's uuid. Signup stays
  portal-scoped at `/portal/signup` since staff are provisioned via
  the Supabase dashboard.
- **RLS-first**: every new table and every new query on an existing table
  must have row-level-security policies scoped by `customer_id`. Do not
  rely on app-layer filtering.
- **No staff schema churn** where avoidable. Additive migrations only.
- **Email**: single nodemailer transport module in `lib/email/`, with
  typed templates. **Provider: Gmail SMTP** via a dedicated Google
  account + App Password. SMTP creds via env, never committed. Transport
  is isolated so we can swap to a transactional provider later without
  touching templates or dispatcher.
- **Types**: extend `types/db.ts` by hand (same convention as rest of
  codebase — no `supabase gen types`).
