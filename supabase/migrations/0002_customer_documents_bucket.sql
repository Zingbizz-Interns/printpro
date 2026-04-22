-- =============================================================================
-- 0002_customer_documents_bucket.sql
--
-- Phase 1: private storage bucket for customer-uploaded documents
-- (GST certificates for now; more later).
--
-- HOW TO APPLY:
--   Paste into Supabase SQL Editor. Safe to re-run.
--
-- NOTES:
--   Storage buckets can be created either via the dashboard UI or via
--   SQL. Doing it via SQL keeps bucket + policies in version control.
-- =============================================================================

-- Create the bucket if it doesn't exist. public=false → bucket is
-- private; we use createSignedUrl for reads.
insert into storage.buckets (id, name, public)
  values ('customer-documents', 'customer-documents', false)
  on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- RLS on storage.objects is enabled by default in Supabase. We only
-- need to add bucket-scoped policies.
--
-- Path convention enforced: first path segment MUST equal auth.uid().
-- i.e. the customer can only read/write/delete objects at
-- `<customer uuid>/...`. Staff (is_staff()) can do everything.
-- -----------------------------------------------------------------------------

drop policy if exists customer_documents_select on storage.objects;
create policy customer_documents_select
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'customer-documents'
    and (
      public.is_staff()
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );

drop policy if exists customer_documents_insert on storage.objects;
create policy customer_documents_insert
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'customer-documents'
    and (
      public.is_staff()
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );

drop policy if exists customer_documents_update on storage.objects;
create policy customer_documents_update
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'customer-documents'
    and (
      public.is_staff()
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  )
  with check (
    bucket_id = 'customer-documents'
    and (
      public.is_staff()
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );

drop policy if exists customer_documents_delete on storage.objects;
create policy customer_documents_delete
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'customer-documents'
    and (
      public.is_staff()
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );
