-- =============================================================================
-- 0004_proof_reviews.sql
--
-- Phase 2 of the client portal rollout: proof approval.
--
-- Adds:
--   1. `public.proof_reviews` table + indexes + RLS
--   2. `public.job_items.proof_uploaded_at` timestamp column
--   3. Trigger `apply_proof_review_decision` — when a customer inserts a
--      proof_review with decision='approved', flip
--      `job_items.design_status` to 'Design - Approved'. Customers have
--      NO direct UPDATE access on job_items (blocked by existing RLS);
--      the status change rides in via this SECURITY DEFINER trigger.
--   4. Trigger `touch_proof_uploaded_at` — when staff re-uploads by
--      changing `job_items.image_url`, stamp proof_uploaded_at=now() and
--      reset design_status from 'Design - Approved' back to
--      'Design - In Progress' so customer reviews the new proof.
--   5. Adds `proof_reviews` to the `supabase_realtime` publication so
--      staff badges update live on the kanban.
--
-- HOW TO APPLY: paste into Supabase SQL editor and run. Idempotent.
-- =============================================================================


-- =============================================================================
-- 1. job_items.proof_uploaded_at
--    Tracks when the currently-stored proof image was uploaded. Reviews
--    older than this timestamp are historical (belong to a previous
--    proof the customer already saw, not the current one).
-- =============================================================================

alter table public.job_items
  add column if not exists proof_uploaded_at timestamptz;

-- Backfill: any existing row with an image is treated as "uploaded just
-- before this migration ran" so approvals entered later will correctly
-- be newer than the upload. We intentionally do NOT backfill items that
-- already have design_status='Design - Approved' — they're done.
update public.job_items
  set proof_uploaded_at = now()
  where proof_uploaded_at is null
    and coalesce(image_url, '') <> '';


-- =============================================================================
-- 2. proof_reviews table
-- =============================================================================

create table if not exists public.proof_reviews (
  id                 bigserial primary key,
  job_item_id        bigint not null references public.job_items(id) on delete cascade,
  customer_user_id   uuid   not null references public.customer_profiles(id) on delete cascade,
  decision           text   not null check (decision in ('approved', 'changes_requested')),
  comment            text   not null default '',
  created_at         timestamptz not null default now()
);

create index if not exists proof_reviews_job_item_id_created_at_idx
  on public.proof_reviews (job_item_id, created_at desc);

create index if not exists proof_reviews_customer_user_id_idx
  on public.proof_reviews (customer_user_id);

comment on table public.proof_reviews is
  'Customer decisions on uploaded design proofs. One row per decision
   event. History is preserved — the ''latest'' review for an item is
   the most recent row whose created_at >= job_items.proof_uploaded_at.';


-- =============================================================================
-- 3. RLS — proof_reviews
--   * Customer: can SELECT + INSERT rows where customer_user_id = auth.uid()
--     AND the target job_item belongs to a job they own.
--   * Customer: no UPDATE / DELETE — a decision is a signed event.
--   * Staff:   full access.
-- =============================================================================

alter table public.proof_reviews enable row level security;

drop policy if exists proof_reviews_select on public.proof_reviews;
create policy proof_reviews_select
  on public.proof_reviews
  for select
  to authenticated
  using (
    public.is_staff()
    or customer_user_id = auth.uid()
  );

drop policy if exists proof_reviews_customer_insert on public.proof_reviews;
create policy proof_reviews_customer_insert
  on public.proof_reviews
  for insert
  to authenticated
  with check (
    public.is_staff()
    or (
      customer_user_id = auth.uid()
      and exists (
        select 1
        from public.job_items ji
        join public.job_orders jo on jo.id = ji.job_order_id
        where ji.id = proof_reviews.job_item_id
          and jo.customer_user_id = auth.uid()
          and coalesce(ji.image_url, '') <> ''
      )
    )
  );

drop policy if exists proof_reviews_staff_write on public.proof_reviews;
create policy proof_reviews_staff_write
  on public.proof_reviews
  for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());


-- =============================================================================
-- 4. Trigger — apply_proof_review_decision
--   Runs SECURITY DEFINER so it can bypass the customer's lack of
--   UPDATE privilege on job_items. Only flips design_status when the
--   target item genuinely belongs to the inserting user's account.
-- =============================================================================

create or replace function public.apply_proof_review_decision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.decision = 'approved' then
    update public.job_items ji
      set design_status = 'Design - Approved'
      from public.job_orders jo
      where ji.id = new.job_item_id
        and jo.id = ji.job_order_id
        and jo.customer_user_id = new.customer_user_id;
  end if;
  return new;
end;
$$;

revoke all on function public.apply_proof_review_decision() from public;

drop trigger if exists proof_reviews_apply_decision on public.proof_reviews;
create trigger proof_reviews_apply_decision
  after insert on public.proof_reviews
  for each row execute function public.apply_proof_review_decision();


-- =============================================================================
-- 5. Trigger — touch_proof_uploaded_at
--   Fires when staff changes image_url on a job_item. Stamps
--   proof_uploaded_at so prior reviews become historical, and if the
--   item was previously approved, resets design_status so the customer
--   re-reviews the new proof.
-- =============================================================================

create or replace function public.touch_proof_uploaded_at()
returns trigger
language plpgsql
as $$
begin
  if coalesce(new.image_url, '') is distinct from coalesce(old.image_url, '')
     and coalesce(new.image_url, '') <> '' then
    new.proof_uploaded_at := now();
    if old.design_status = 'Design - Approved' then
      new.design_status := 'Design - In Progress';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists job_items_touch_proof_uploaded_at on public.job_items;
create trigger job_items_touch_proof_uploaded_at
  before update of image_url on public.job_items
  for each row execute function public.touch_proof_uploaded_at();

-- On INSERT of a job_item that already has an image_url (new job
-- saved with a proof already attached), stamp it too.
create or replace function public.stamp_proof_uploaded_at_on_insert()
returns trigger
language plpgsql
as $$
begin
  if coalesce(new.image_url, '') <> '' and new.proof_uploaded_at is null then
    new.proof_uploaded_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists job_items_stamp_proof_uploaded_at on public.job_items;
create trigger job_items_stamp_proof_uploaded_at
  before insert on public.job_items
  for each row execute function public.stamp_proof_uploaded_at_on_insert();


-- =============================================================================
-- 6. Realtime publication
--   Staff-side kanban badges ("Awaiting approval / Changes requested")
--   need live updates. The publication was created in 0003; we just add
--   the new table.
-- =============================================================================

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
       and tablename = 'proof_reviews'
  ) then
    alter publication supabase_realtime add table public.proof_reviews;
  end if;
end
$$;


-- =============================================================================
-- 7. POST-APPLY VERIFICATION
--
--   -- Confirm table + policies:
--   select tablename, policyname from pg_policies
--     where schemaname='public' and tablename='proof_reviews';
--
--   -- Confirm triggers:
--   select tgname, tgrelid::regclass, tgenabled
--     from pg_trigger where tgname like '%proof%';
--
--   -- Confirm publication includes the table:
--   select tablename from pg_publication_tables
--     where pubname='supabase_realtime' and tablename='proof_reviews';
-- =============================================================================
