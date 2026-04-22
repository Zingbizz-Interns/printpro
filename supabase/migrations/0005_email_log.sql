-- =============================================================================
-- 0005_email_log.sql
--
-- Phase 3 of the client portal rollout: email notifications.
--
-- Adds `public.email_log` — a row per sent (or attempted) portal email.
-- The dispatcher at `/api/portal/dispatch` writes here after every send
-- attempt; it's the single source of truth for:
--   * "did we already email about this?" (60-second debounce)
--   * staff-facing notification history
--   * failed-send visibility (error column populated when nodemailer threw)
--
-- HOW TO APPLY: paste into Supabase SQL editor and run. Idempotent.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. email_log table
-- -----------------------------------------------------------------------------

create table if not exists public.email_log (
  id                 bigserial primary key,
  event              text not null,
  debounce_key       text not null,
  customer_user_id   uuid references public.customer_profiles(id) on delete set null,
  job_id             bigint references public.job_orders(id) on delete set null,
  job_item_id        bigint references public.job_items(id)  on delete set null,
  to_email           text,                            -- null when send failed before recipient resolution
  sent_at            timestamptz not null default now(),
  error              text,
  inserted_by        uuid default auth.uid()          -- the caller who triggered the send
);

create index if not exists email_log_debounce_idx
  on public.email_log (debounce_key, sent_at desc);

create index if not exists email_log_customer_user_id_idx
  on public.email_log (customer_user_id, sent_at desc);

create index if not exists email_log_job_id_idx
  on public.email_log (job_id, sent_at desc);

comment on table public.email_log is
  'Every portal email send attempt (success or failure). The dispatcher
   debounces on (event, scope_id) by querying this table for rows in
   the last 60s before sending.';


-- -----------------------------------------------------------------------------
-- 2. RLS
--   INSERT — any authenticated user (the route inserts under the
--            caller''s JWT; RLS would otherwise block it).
--   SELECT — staff (all rows) + anyone for their OWN rows, so the
--            dispatcher''s debounce lookup works under a customer JWT.
--   UPDATE / DELETE — nobody (log is append-only).
-- -----------------------------------------------------------------------------

alter table public.email_log enable row level security;

drop policy if exists email_log_staff_select on public.email_log;
drop policy if exists email_log_select on public.email_log;
create policy email_log_select
  on public.email_log
  for select
  to authenticated
  using (public.is_staff() or inserted_by = auth.uid());

drop policy if exists email_log_insert on public.email_log;
create policy email_log_insert
  on public.email_log
  for insert
  to authenticated
  with check (true);


-- -----------------------------------------------------------------------------
-- 3. POST-APPLY VERIFICATION
--
--   select policyname from pg_policies
--     where schemaname='public' and tablename='email_log';
--
--   -- Sample row (staff-only SELECT):
--   -- select event, debounce_key, to_email, sent_at, error
--   --   from public.email_log order by sent_at desc limit 10;
-- -----------------------------------------------------------------------------
