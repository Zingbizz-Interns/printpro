-- =============================================================================
-- 0007_feedback_and_scheduled_emails.sql
--
-- Phase 5 of the client portal rollout: post-delivery feedback + rating.
--
-- Adds:
--   1. `public.job_feedback` — one customer rating per delivered job
--      (unique per job_order_id, editable by the customer for 14 days).
--   2. `public.pending_emails` — queue of scheduled portal emails. For
--      v1 only the `feedback-request` event uses this queue; the cron
--      route `/api/cron/send-scheduled-emails` drains it.
--   3. Trigger `enqueue_feedback_request_email` on job_orders — when
--      `job_status` flips to 'Delivered' we enqueue a feedback-request
--      row with `send_after = now() + 1 hour`. `on conflict do nothing`
--      keeps the queue idempotent if the job cycles in/out of Delivered.
--   4. RLS: customer can SELECT/INSERT own feedback, UPDATE own ONLY
--      within 14 days of created_at. Staff read all. `pending_emails`
--      is staff/service-role only — customers never touch it.
--   5. Adds `job_feedback` to the `supabase_realtime` publication so the
--      owner dashboard updates live.
--
-- HOW TO APPLY: paste into Supabase SQL editor and run. Idempotent.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. job_feedback table
-- -----------------------------------------------------------------------------

create table if not exists public.job_feedback (
  id                 bigserial primary key,
  job_order_id       bigint not null references public.job_orders(id) on delete cascade,
  customer_user_id   uuid   not null references public.customer_profiles(id) on delete cascade,
  rating             smallint not null check (rating between 1 and 5),
  comment            text   not null default '',
  would_recommend    boolean,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (job_order_id)
);

create index if not exists job_feedback_customer_user_id_idx
  on public.job_feedback (customer_user_id, created_at desc);

create index if not exists job_feedback_created_at_idx
  on public.job_feedback (created_at desc);

create index if not exists job_feedback_rating_idx
  on public.job_feedback (rating);

comment on table public.job_feedback is
  'One customer rating per delivered job. Editable by the customer for
   14 days after created_at (enforced in the UPDATE RLS policy).';


-- Keep updated_at fresh on edits.
create or replace function public.touch_job_feedback_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists job_feedback_touch_updated_at on public.job_feedback;
create trigger job_feedback_touch_updated_at
  before update on public.job_feedback
  for each row execute function public.touch_job_feedback_updated_at();


-- -----------------------------------------------------------------------------
-- 2. RLS — job_feedback
--   SELECT — staff (all rows) + customer (own rows).
--   INSERT — customer on a Delivered job they own; staff anywhere.
--   UPDATE — customer on own rows WITHIN 14 days; staff anywhere.
--   DELETE — nobody (keeps the audit trail; staff can delete via dashboard
--            if needed).
-- -----------------------------------------------------------------------------

alter table public.job_feedback enable row level security;

drop policy if exists job_feedback_select on public.job_feedback;
create policy job_feedback_select
  on public.job_feedback
  for select
  to authenticated
  using (
    public.is_staff()
    or customer_user_id = auth.uid()
  );

drop policy if exists job_feedback_customer_insert on public.job_feedback;
create policy job_feedback_customer_insert
  on public.job_feedback
  for insert
  to authenticated
  with check (
    public.is_staff()
    or (
      customer_user_id = auth.uid()
      and exists (
        select 1
        from public.job_orders jo
        where jo.id = job_feedback.job_order_id
          and jo.customer_user_id = auth.uid()
          and jo.job_status = 'Delivered'
      )
    )
  );

drop policy if exists job_feedback_customer_update on public.job_feedback;
create policy job_feedback_customer_update
  on public.job_feedback
  for update
  to authenticated
  using (
    public.is_staff()
    or (
      customer_user_id = auth.uid()
      and created_at > now() - interval '14 days'
    )
  )
  with check (
    public.is_staff()
    or (
      customer_user_id = auth.uid()
      and created_at > now() - interval '14 days'
    )
  );


-- -----------------------------------------------------------------------------
-- 3. pending_emails queue
--    Small table that stores scheduled portal emails. Cron route reads
--    rows where `send_after <= now() and sent_at is null`, dispatches,
--    then stamps `sent_at` (and `error` on failure). No customer-facing
--    policy — only staff/service-role touches this table.
-- -----------------------------------------------------------------------------

create table if not exists public.pending_emails (
  id                 bigserial primary key,
  event_type         text not null,           -- e.g. 'feedback-request'
  job_order_id       bigint references public.job_orders(id) on delete cascade,
  customer_user_id   uuid   references public.customer_profiles(id) on delete cascade,
  payload            jsonb  not null default '{}'::jsonb,
  send_after         timestamptz not null default now(),
  sent_at            timestamptz,
  attempts           integer not null default 0,
  last_error         text,
  created_at         timestamptz not null default now()
);

-- One pending row per (event, job) — re-enqueueing is a no-op.
-- Unique index (not constraint) so we can scope to the feedback-request
-- event specifically; other events later can have their own partial index.
create unique index if not exists pending_emails_feedback_request_uniq
  on public.pending_emails (job_order_id)
  where event_type = 'feedback-request';

create index if not exists pending_emails_due_idx
  on public.pending_emails (send_after)
  where sent_at is null;

comment on table public.pending_emails is
  'Queue of portal emails to dispatch on a schedule. Drained by the
   /api/cron/send-scheduled-emails route (bearer-guarded with
   CRON_SECRET). Customers never read or write this table.';

alter table public.pending_emails enable row level security;

drop policy if exists pending_emails_staff_read on public.pending_emails;
create policy pending_emails_staff_read
  on public.pending_emails
  for select
  to authenticated
  using (public.is_staff());

-- No INSERT / UPDATE / DELETE policy for authenticated — the cron route
-- uses the service-role key and bypasses RLS. The trigger below runs
-- SECURITY DEFINER and inserts on behalf of the caller.


-- -----------------------------------------------------------------------------
-- 4. Trigger — enqueue_feedback_request_email
--    Fires on UPDATE of job_orders.job_status. When status newly flips
--    to 'Delivered' we insert a feedback-request row into pending_emails
--    with send_after = now() + 1 hour. `on conflict do nothing` means
--    cycling a job out of and back into Delivered doesn't double-enqueue.
-- -----------------------------------------------------------------------------

create or replace function public.enqueue_feedback_request_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.job_status = 'Delivered'
     and (old.job_status is distinct from new.job_status)
     and new.customer_user_id is not null then
    insert into public.pending_emails (event_type, job_order_id, customer_user_id, send_after)
      values ('feedback-request', new.id, new.customer_user_id, now() + interval '1 hour')
      on conflict do nothing;
  end if;
  return new;
end;
$$;

revoke all on function public.enqueue_feedback_request_email() from public;

drop trigger if exists job_orders_enqueue_feedback_request on public.job_orders;
create trigger job_orders_enqueue_feedback_request
  after update of job_status on public.job_orders
  for each row execute function public.enqueue_feedback_request_email();


-- -----------------------------------------------------------------------------
-- 5. Realtime publication — job_feedback
-- -----------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    create publication supabase_realtime;
  end if;

  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'job_feedback'
  ) then
    alter publication supabase_realtime add table public.job_feedback;
  end if;
end
$$;


-- -----------------------------------------------------------------------------
-- 6. POST-APPLY VERIFICATION
--
--   select policyname, cmd from pg_policies
--     where schemaname='public' and tablename='job_feedback';
--
--   select tgname from pg_trigger
--     where tgname = 'job_orders_enqueue_feedback_request';
--
--   select tablename from pg_publication_tables
--     where pubname='supabase_realtime' and tablename='job_feedback';
-- -----------------------------------------------------------------------------
