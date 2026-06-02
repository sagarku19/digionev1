-- Drop legacy uploads and user_files buckets and their RLS policies.
--
-- Both buckets are abandoned from earlier dev iterations. Pre-deletion audit
-- (run via Supabase MCP) confirmed zero DB references in products.thumbnail_url
-- and profiles.avatar_url. All 10 orphan objects (including an Aadhaar test PDF
-- in uploads) were deleted via the Storage Management API before bucket drop.
--
-- The bucket DROPs themselves cannot run from SQL because Supabase's
-- storage.protect_delete trigger blocks direct DELETE on storage.buckets.
-- They were executed out-of-band:
--   DELETE https://{project}.supabase.co/storage/v1/bucket/uploads
--   DELETE https://{project}.supabase.co/storage/v1/bucket/user_files
-- with the service-role key as Bearer + apikey headers.
--
-- This migration is the record of the RLS-policy cleanup that DID run in SQL.

drop policy if exists "Creators can manage own files" on storage.objects;
drop policy if exists "Creators can upload own files" on storage.objects;
drop policy if exists "Public read access" on storage.objects;
drop policy if exists "all vslhqb_0" on storage.objects;
drop policy if exists "all vslhqb_1" on storage.objects;
drop policy if exists "all vslhqb_2" on storage.objects;
drop policy if exists "all vslhqb_3" on storage.objects;
