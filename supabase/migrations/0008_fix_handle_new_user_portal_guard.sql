-- =============================================================================
-- 0008_fix_handle_new_user_portal_guard.sql
--
-- Fixes a privilege-escalation bug where portal (customer) signups were
-- ALSO landing in public.profiles with role='staff'. Two triggers fire on
-- auth.users insert:
--   - handle_new_customer_user()  → inserts into customer_profiles iff
--                                    raw_user_meta_data.portal = 'true'
--   - handle_new_user()           → unconditionally inserts into profiles
--                                    (role defaulting to 'staff')
--
-- Result: portal signups got rows in BOTH tables. They passed is_staff(),
-- so RLS treated them as staff at the DB level, and resolveRoleDestination
-- routed them to /kanban instead of /portal.
--
-- This migration:
--   1. Rewrites handle_new_user() to skip when portal='true'
--   2. Adds on conflict (id) do nothing for idempotency
--   3. Cleans up existing dual rows: deletes profiles rows whose id is in
--      customer_profiles (those users are customers, not staff)
-- =============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Skip portal signups — handle_new_customer_user() owns those.
  if (new.raw_user_meta_data ->> 'portal') = 'true' then
    return new;
  end if;

  insert into public.profiles (id, name, username, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'role', 'staff')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Clean up: any existing profiles row whose id matches a customer_profiles
-- row was created by the buggy trigger. That user is a customer, not staff.
delete from public.profiles
where id in (select id from public.customer_profiles);
