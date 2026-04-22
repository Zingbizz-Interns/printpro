-- =============================================================================
-- 0003_realtime_publication.sql
--
-- Supabase realtime fires `postgres_changes` events only for tables
-- explicitly added to the `supabase_realtime` publication. Without this,
-- both the staff kanban live-sync and the portal's "Live" indicator will
-- sit at "Connecting" forever.
--
-- DIAGNOSTIC (run before and after to confirm):
--   select tablename from pg_publication_tables
--     where pubname = 'supabase_realtime' order by tablename;
--
-- HOW TO APPLY:
--   Paste into Supabase SQL Editor. Safe to re-run — each ALTER is
--   wrapped in a DO block that skips tables already in the publication.
-- =============================================================================

do $$
declare
  t text;
begin
  foreach t in array array['job_orders', 'job_items', 'partial_payments',
                           'customers', 'customer_profiles'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end
$$;
