-- =============================================================================
-- 0006_reorder_quote_artwork.sql
--
-- Phase 4 of the client portal rollout:
--   1. A new `Pending Review` job status that customers can put jobs
--      into but cannot price.
--   2. `public.customer_artwork` — files the customer uploaded through
--      the portal (quotes, re-orders). Staff-uploaded proofs on
--      `job_items` are surfaced to the customer separately, not copied.
--   3. `public.create_pending_job(...)` — the ONLY path a customer can
--      create a job. Runs SECURITY DEFINER and pins every column that
--      touches price/capacity to safe defaults so a customer can't
--      forge rate, discount_pct, created_by, or job_status.
--   4. `public.add_customer_artwork(...)` — the ONLY path a customer
--      can insert into `customer_artwork`. Pins customer_user_id +
--      source to values the server chooses.
--   5. Rate-limit helper `public.customer_recent_pending_job_count()`
--      so the RPC can reject spam (max 3 pending jobs in the last
--      hour per customer).
--
-- HOW TO APPLY: paste into Supabase SQL editor, run. Idempotent.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Pending Review status
--    `job_status` is plain text (no DB enum), so no migration of the
--    column itself is needed — we just document the new allowed value.
-- -----------------------------------------------------------------------------

comment on column public.job_orders.job_status is
  'Text — one of Pending Review | Design - Not yet Started | Design - In Progress | Design - Approved | In Printing | In Finishing | Ready for Delivery | Delivered | On Hold. App-side TypeScript keeps the enum.';


-- -----------------------------------------------------------------------------
-- 2. customer_artwork table
-- -----------------------------------------------------------------------------

create table if not exists public.customer_artwork (
  id                    bigserial primary key,
  customer_user_id      uuid not null references public.customer_profiles(id) on delete cascade,
  file_url              text not null,
  file_name             text not null default '',
  mime_type             text not null default '',
  size_bytes            bigint not null default 0,
  source                text not null check (source in ('quote', 'upload', 'reorder')),
  source_job_id         bigint references public.job_orders(id) on delete set null,
  uploaded_at           timestamptz not null default now()
);

create index if not exists customer_artwork_customer_user_id_idx
  on public.customer_artwork (customer_user_id, uploaded_at desc);

comment on table public.customer_artwork is
  'Files the customer uploaded through the portal (quote attachments,
   re-order references, standalone uploads). Staff-uploaded proofs live
   on job_items.image_url and are listed alongside these rows but not
   copied into this table.';


-- -----------------------------------------------------------------------------
-- 3. RLS — customer_artwork
-- -----------------------------------------------------------------------------

alter table public.customer_artwork enable row level security;

drop policy if exists customer_artwork_select on public.customer_artwork;
create policy customer_artwork_select
  on public.customer_artwork
  for select
  to authenticated
  using (public.is_staff() or customer_user_id = auth.uid());

-- INSERT is blocked for customers at the policy level — they go
-- through `add_customer_artwork(...)` which runs security definer.
drop policy if exists customer_artwork_staff_insert on public.customer_artwork;
create policy customer_artwork_staff_insert
  on public.customer_artwork
  for insert
  to authenticated
  with check (public.is_staff());

-- DELETE — customer can delete their own rows. Staff can delete anything.
drop policy if exists customer_artwork_delete on public.customer_artwork;
create policy customer_artwork_delete
  on public.customer_artwork
  for delete
  to authenticated
  using (public.is_staff() or customer_user_id = auth.uid());


-- -----------------------------------------------------------------------------
-- 4. add_customer_artwork(file_url, file_name, mime_type, size_bytes,
--                         source, source_job_id)
--    The only path a customer can populate `customer_artwork`. Forces
--    customer_user_id = auth.uid() and validates `source`.
-- -----------------------------------------------------------------------------

create or replace function public.add_customer_artwork(
  p_file_url     text,
  p_file_name    text,
  p_mime_type    text,
  p_size_bytes   bigint,
  p_source       text,
  p_source_job_id bigint default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;
  if p_source not in ('quote', 'upload', 'reorder') then
    raise exception 'invalid source: %', p_source;
  end if;
  if coalesce(p_file_url, '') = '' then
    raise exception 'file_url is required';
  end if;

  insert into public.customer_artwork
    (customer_user_id, file_url, file_name, mime_type, size_bytes, source, source_job_id)
  values
    (v_uid, p_file_url, coalesce(p_file_name, ''), coalesce(p_mime_type, ''),
     coalesce(p_size_bytes, 0), p_source, p_source_job_id)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.add_customer_artwork(text, text, text, bigint, text, bigint) from public;
grant execute on function public.add_customer_artwork(text, text, text, bigint, text, bigint) to authenticated;


-- -----------------------------------------------------------------------------
-- 5. Rate-limit helper
-- -----------------------------------------------------------------------------

create or replace function public.customer_recent_pending_job_count()
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
    from public.job_orders
   where customer_user_id = auth.uid()
     and job_status = 'Pending Review';
$$;

revoke all on function public.customer_recent_pending_job_count() from public;
grant execute on function public.customer_recent_pending_job_count() to authenticated;


-- -----------------------------------------------------------------------------
-- 6. create_pending_job(p_items jsonb, p_notes text, p_source text,
--                       p_original_job_id bigint, p_delivery_date date)
--    Customer-facing entry point for Reorder and Quote Request.
--    Forces every price/capacity column to a safe default so a client
--    can't forge pricing. Returns the new job_orders.id.
-- -----------------------------------------------------------------------------

create or replace function public.create_pending_job(
  p_items           jsonb,
  p_notes           text  default '',
  p_source          text  default 'quote',       -- 'quote' | 'reorder'
  p_original_job_id bigint default null,
  p_delivery_date   date   default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.customer_profiles;
  v_job_no int;
  v_job_id bigint;
  v_notes text := coalesce(p_notes, '');
  v_prefix text;
  v_source text := coalesce(p_source, 'quote');
  v_pending_count int;
  v_item jsonb;
  v_idx int := 0;
  v_desc text;
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;
  if v_source not in ('quote', 'reorder') then
    raise exception 'invalid source: %', v_source;
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'at least one item is required';
  end if;
  if jsonb_array_length(p_items) > 50 then
    raise exception 'too many items (max 50)';
  end if;

  -- Rate limit: cap at 3 simultaneously-pending-review rows per
  -- customer. This is a queue-depth limit, not a per-hour limit —
  -- customers unblock themselves as staff prices/rejects each one.
  select count(*) into v_pending_count
    from public.job_orders
   where customer_user_id = v_uid
     and job_status = 'Pending Review';
  if v_pending_count >= 3 then
    raise exception 'rate_limited: you already have 3 pending requests — please wait for staff to review one';
  end if;

  -- Profile snapshot (for company_name, contact_person, etc. on the job).
  select * into v_profile
    from public.customer_profiles
   where id = v_uid;
  if not found then
    raise exception 'customer profile not found';
  end if;

  -- Assemble the prefix for special_notes.
  if v_source = 'reorder' then
    if p_original_job_id is null then
      v_prefix := 'Reordered by customer.';
    else
      v_prefix := 'Reordered by customer from job #' || p_original_job_id::text || '.';
    end if;
  else
    v_prefix := 'Quote request from portal.';
  end if;

  -- Next job_no. Serialize via an xact advisory lock so concurrent
  -- staff + customer inserts don't hand out duplicate numbers.
  perform pg_advisory_xact_lock(hashtext('job_orders.job_no_alloc'));
  select coalesce(max(job_no), 0) + 1 into v_job_no from public.job_orders;

  insert into public.job_orders (
    job_no, order_date,
    company_name, contact_person, contact_number, additional_contact,
    email_id, gst_no, customer_address,
    delivery_date, delivery_time,
    job_status, payment_status,
    advance_paid, advance_paid_on, balance_paid_on,
    special_notes, gst_enabled, round_off, discount_pct,
    created_by, created_by_id, customer_user_id
  ) values (
    v_job_no, current_date,
    coalesce(v_profile.company_name, ''), coalesce(v_profile.name, ''),
    coalesce(v_profile.contact_number, ''), '',
    coalesce(v_profile.email, ''), coalesce(v_profile.gst_no, ''),
    coalesce(v_profile.billing_address, ''),
    p_delivery_date, '',
    'Pending Review', 'Unpaid',
    0, null, null,
    trim(both E'\n' from v_prefix || case when v_notes = '' then '' else E'\n\n' || v_notes end),
    false, true, 0,
    '', null, v_uid
  )
  returning id into v_job_id;

  -- Items: pin rate / design_status to safe defaults; take description
  -- fields from the JSON payload.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_desc := coalesce(v_item->>'description', '');
    insert into public.job_items (
      job_order_id, job_no_sub,
      category, description, size, material, specs, finishing,
      quantity, unit, rate,
      design_status, print_status, remarks, image_url, sort_order
    ) values (
      v_job_id, v_job_no::text || '-' || (v_idx + 1)::text,
      coalesce(v_item->>'category', ''),
      v_desc,
      coalesce(v_item->>'size', ''),
      coalesce(v_item->>'material', ''),
      coalesce(v_item->>'specs', ''),
      coalesce(v_item->>'finishing', ''),
      coalesce((v_item->>'quantity')::numeric, 0),
      coalesce(nullif(v_item->>'unit', ''), 'Nos'),
      0,                                 -- rate is pinned to 0, staff sets it
      'Design - Not yet Started',
      'Not Printed',
      '',
      coalesce(v_item->>'image_url', ''),
      v_idx
    );
    v_idx := v_idx + 1;
  end loop;

  return v_job_id;
end;
$$;

revoke all on function public.create_pending_job(jsonb, text, text, bigint, date) from public;
grant execute on function public.create_pending_job(jsonb, text, text, bigint, date) to authenticated;


-- -----------------------------------------------------------------------------
-- 7. Realtime publication — customer_artwork
-- -----------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'customer_artwork'
  ) then
    alter publication supabase_realtime add table public.customer_artwork;
  end if;
end
$$;


-- -----------------------------------------------------------------------------
-- 8. POST-APPLY VERIFICATION
--
--   -- Confirm RPCs exist:
--   select proname from pg_proc where proname in
--     ('create_pending_job', 'add_customer_artwork',
--      'customer_recent_pending_job_count');
--
--   -- Confirm customer_artwork policies:
--   select policyname, cmd from pg_policies
--     where schemaname='public' and tablename='customer_artwork';
--
--   -- Confirm realtime publication:
--   select tablename from pg_publication_tables
--     where pubname='supabase_realtime' and tablename='customer_artwork';
-- -----------------------------------------------------------------------------
