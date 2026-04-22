-- =============================================================================
-- 0001_customer_portal_foundations.sql
--
-- Phase 0 of the client portal rollout. Landing:
--   1. customer_profiles table (new), keyed by auth.users.id
--   2. job_orders.customer_user_id column + index
--   3. public.is_staff() helper function
--   4. auth.users → customer_profiles row-creation trigger
--   5. RLS policies scoped so customers see only their own jobs,
--      staff (is_staff()) keep full access
--
-- HOW TO APPLY:
--   Paste this whole file into the Supabase SQL editor. It is idempotent —
--   re-running is safe. Run the DIAGNOSTICS block first (commented out at
--   the top) to understand current RLS state before going live.
--
-- SAFETY NOTES:
--   - Per refference/API.md, this project historically relied on the anon
--     key + UI-layer filtering with minimal RLS. This migration enables
--     RLS on existing business tables. STAFF MUST BE AUTHENTICATED
--     (signInWithPassword, already the case) or staff pages will break.
--   - All customer-facing policies include `public.is_staff() OR ...` so
--     existing staff behavior is preserved.
--   - If anything goes wrong, every `create policy` below is paired with a
--     `drop policy if exists`, so rollback is: copy the drops, run them.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- DIAGNOSTICS (run once manually before applying the rest of this file):
--
--   select tablename, rowsecurity from pg_tables where schemaname='public';
--   select tablename, policyname, cmd, roles, qual
--     from pg_policies where schemaname='public' order by tablename;
--
-- If any of job_orders / job_items / partial_payments already have policies,
-- verify they include a staff bypass before relying on the new ones.
-- -----------------------------------------------------------------------------


-- =============================================================================
-- 1. customer_profiles
-- =============================================================================

create table if not exists public.customer_profiles (
  id                   uuid primary key references auth.users(id) on delete cascade,
  email                text not null,
  name                 text not null default '',
  company_name         text not null default '',
  contact_number       text not null default '',
  gst_no               text not null default '',
  billing_address      text not null default '',
  gst_certificate_url  text,
  email_prefs          jsonb not null default '{}'::jsonb,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create unique index if not exists customer_profiles_email_idx
  on public.customer_profiles (lower(email));

comment on table public.customer_profiles is
  'Customer-portal accounts. Staff profiles live in public.profiles;
   the two tables are disjoint by design.';


-- =============================================================================
-- 2. job_orders.customer_user_id
-- =============================================================================

alter table public.job_orders
  add column if not exists customer_user_id uuid references public.customer_profiles(id) on delete set null;

create index if not exists job_orders_customer_user_id_idx
  on public.job_orders (customer_user_id);

comment on column public.job_orders.customer_user_id is
  'Nullable FK → customer_profiles.id. Populated when a job is linked to
   a portal account (either manually by staff or auto-matched by email
   at customer signup time). Historical jobs keep it null.';


-- =============================================================================
-- 3. is_staff() helper
-- =============================================================================

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_active = true
  );
$$;

comment on function public.is_staff() is
  'Returns true when the current auth.uid() is an active staff/owner
   profile. Used as the escape hatch in every customer-facing RLS
   policy so staff retain full access.';

-- Lock it down — only authenticated users should ever call it.
revoke all on function public.is_staff() from public;
grant execute on function public.is_staff() to authenticated;


-- =============================================================================
-- 4. handle_new_customer_user() trigger
--    Creates a customer_profiles row when someone signs up through the
--    portal. We differentiate portal signups via user_metadata.portal = true
--    (set client-side in supabase.auth.signUp({ options: { data: ... }})).
-- =============================================================================

create or replace function public.handle_new_customer_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only create a customer_profile when the signup explicitly flagged it
  -- as a portal signup. Staff are provisioned separately into profiles.
  if (new.raw_user_meta_data ->> 'portal') is distinct from 'true' then
    return new;
  end if;

  insert into public.customer_profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_customer on auth.users;
create trigger on_auth_user_created_customer
  after insert on auth.users
  for each row execute function public.handle_new_customer_user();


-- =============================================================================
-- 5. updated_at trigger for customer_profiles
-- =============================================================================

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists customer_profiles_touch_updated_at on public.customer_profiles;
create trigger customer_profiles_touch_updated_at
  before update on public.customer_profiles
  for each row execute function public.touch_updated_at();


-- =============================================================================
-- 6. RLS — customer_profiles
-- =============================================================================

alter table public.customer_profiles enable row level security;

drop policy if exists customer_profiles_self_select on public.customer_profiles;
create policy customer_profiles_self_select
  on public.customer_profiles
  for select
  to authenticated
  using (id = auth.uid() or public.is_staff());

drop policy if exists customer_profiles_self_update on public.customer_profiles;
create policy customer_profiles_self_update
  on public.customer_profiles
  for update
  to authenticated
  using (id = auth.uid() or public.is_staff())
  with check (id = auth.uid() or public.is_staff());

-- No customer-facing INSERT policy — rows are created by the trigger on
-- auth.users. Staff can insert if they need to manually link an account.
drop policy if exists customer_profiles_staff_insert on public.customer_profiles;
create policy customer_profiles_staff_insert
  on public.customer_profiles
  for insert
  to authenticated
  with check (public.is_staff());

drop policy if exists customer_profiles_staff_delete on public.customer_profiles;
create policy customer_profiles_staff_delete
  on public.customer_profiles
  for delete
  to authenticated
  using (public.is_staff());


-- =============================================================================
-- 7. RLS — job_orders / job_items / partial_payments
--
-- The pattern: one policy per command (SELECT/INSERT/UPDATE/DELETE).
-- `is_staff()` is ORed into every check so staff keep full access.
-- Customers only get SELECT, scoped to their own customer_user_id.
-- =============================================================================

alter table public.job_orders       enable row level security;
alter table public.job_items        enable row level security;
alter table public.partial_payments enable row level security;

-- ---- job_orders ----
drop policy if exists job_orders_select on public.job_orders;
create policy job_orders_select
  on public.job_orders
  for select
  to authenticated
  using (
    public.is_staff()
    or customer_user_id = auth.uid()
  );

drop policy if exists job_orders_staff_write on public.job_orders;
create policy job_orders_staff_write
  on public.job_orders
  for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- ---- job_items ----
drop policy if exists job_items_select on public.job_items;
create policy job_items_select
  on public.job_items
  for select
  to authenticated
  using (
    public.is_staff()
    or exists (
      select 1 from public.job_orders jo
      where jo.id = job_items.job_order_id
        and jo.customer_user_id = auth.uid()
    )
  );

drop policy if exists job_items_staff_write on public.job_items;
create policy job_items_staff_write
  on public.job_items
  for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- ---- partial_payments ----
drop policy if exists partial_payments_select on public.partial_payments;
create policy partial_payments_select
  on public.partial_payments
  for select
  to authenticated
  using (
    public.is_staff()
    or exists (
      select 1 from public.job_orders jo
      where jo.id = partial_payments.job_order_id
        and jo.customer_user_id = auth.uid()
    )
  );

drop policy if exists partial_payments_staff_write on public.partial_payments;
create policy partial_payments_staff_write
  on public.partial_payments
  for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());


-- =============================================================================
-- 8. RLS — reference tables (products, customers, profiles)
--
-- Customers shouldn't be able to read the staff-side `profiles` table or
-- the `customers` CRM table. `products` can be readable so the portal
-- category dropdown (Phase 4) works without extra RPC.
-- =============================================================================

alter table public.profiles  enable row level security;
alter table public.customers enable row level security;
alter table public.products  enable row level security;

-- ---- profiles: staff-only ----
drop policy if exists profiles_staff_all on public.profiles;
create policy profiles_staff_all
  on public.profiles
  for all
  to authenticated
  using (public.is_staff() or id = auth.uid())
  with check (public.is_staff());

-- ---- customers (CRM): staff-only ----
drop policy if exists customers_staff_all on public.customers;
create policy customers_staff_all
  on public.customers
  for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- ---- products: readable by everyone authenticated, writable by staff ----
drop policy if exists products_read_all on public.products;
create policy products_read_all
  on public.products
  for select
  to authenticated
  using (true);

drop policy if exists products_staff_write on public.products;
create policy products_staff_write
  on public.products
  for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());


-- =============================================================================
-- 9. POST-APPLY VERIFICATION
--
-- After running this migration, sanity-check:
--
--   -- Staff can still see their jobs
--   -- (run as a staff user in the staff app):
--   select count(*) from public.job_orders;     -- should match previous count
--
--   -- Customer sees nothing until linked:
--   -- (run as a freshly-signed-up customer):
--   select count(*) from public.job_orders;     -- should be 0
--
--   -- Customer sees only their own jobs after staff links customer_user_id:
--   update public.job_orders
--     set customer_user_id = '<customer uuid>'
--     where id = <job id>;
--   -- Re-query as the customer — should now return that job.
-- =============================================================================
