-- ============================================================================
-- DigiOne — Storage buckets, storage RLS, and auth-schema triggers
-- ============================================================================
-- Run this AFTER the baseline migration + seed on a fresh Supabase project.
-- These objects live OUTSIDE the public schema (storage.*, auth.*) and are NOT
-- captured by a `public`-schema pg_dump — recreate them explicitly.
--
-- The auth triggers are the reason signup populates public.users / public.profiles.
-- Skipping them = broken onboarding on the new project.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. STORAGE BUCKETS  (idempotent)
-- ----------------------------------------------------------------------------
-- public-asset    — DigiOne-managed public assets (stock images, demo content,
--   sample link-in-bio backgrounds). Public. Intended to be DigiOne-write-only
--   long-term; currently still accepts creator writes via /api/upload until the
--   read-only flip lands.
-- creator-public  — all creator-uploaded public images (covers, link-in-bio,
--   avatar, banner, other) via {creator_id}/{kind}/{ts}_{file} path. Replaced
--   the earlier products bucket which has been dropped.
-- creator-content + creator-private — private (public: false). RLS deferred;
--   service_role bypasses RLS for /api/upload writes; reads go through future
--   signed-URL endpoints.
-- (Legacy uploads + user_files buckets dropped 2026-06-03 — see
--  migrations/20260605100000_drop_legacy_storage_buckets.sql for the record.)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('public-asset',     'public-asset',     true,  5242880,    null),
  ('creator-public',   'creator-public',   true,  5242880,    array['image/png','image/jpeg','image/webp','image/gif','image/svg+xml','image/x-icon']),
  ('creator-content',  'creator-content',  false, 524288000,  array['application/pdf','application/zip','application/x-zip-compressed','application/epub+zip','application/octet-stream','video/mp4','video/quicktime','video/webm','audio/mpeg','audio/mp4','audio/wav','image/png','image/jpeg','image/webp','text/plain','text/csv']),
  ('creator-private',  'creator-private',  false, 10485760,   array['application/pdf','image/png','image/jpeg','image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ----------------------------------------------------------------------------
-- 2. STORAGE RLS POLICIES on storage.objects
--    (storage.objects already has RLS enabled by Supabase)
-- ----------------------------------------------------------------------------
-- public-asset bucket — full public control (mirrors the current production state
-- where creators still upload link-in-bio images here). Will tighten to
-- DigiOne-write-only when the repurposing PR lands.
drop policy if exists "FULL Control 1pl33po_0" on storage.objects;
create policy "FULL Control 1pl33po_0" on storage.objects for select to public using (bucket_id = 'public-asset');
drop policy if exists "FULL Control 1pl33po_1" on storage.objects;
create policy "FULL Control 1pl33po_1" on storage.objects for insert to public with check (bucket_id = 'public-asset');
drop policy if exists "FULL Control 1pl33po_2" on storage.objects;
create policy "FULL Control 1pl33po_2" on storage.objects for update to public using (bucket_id = 'public-asset');
drop policy if exists "FULL Control 1pl33po_3" on storage.objects;
create policy "FULL Control 1pl33po_3" on storage.objects for delete to public using (bucket_id = 'public-asset');

-- creator-public, creator-content, creator-private — RLS policies intentionally
-- deferred. public: false on the private pair blocks anonymous reads via
-- /object/public/... paths; service_role bypasses RLS for /api/upload writes;
-- read paths for the private buckets will be signed-URL endpoints minted by
-- access-checked routes.
-- TODO when auth gate lands: add per-creator INSERT/UPDATE/DELETE policies
-- scoped to (storage.foldername(name))[1] = profiles.id; SELECT for the two
-- private buckets stays default-deny.

-- ----------------------------------------------------------------------------
-- 3. AUTH TRIGGERS on auth.users
--    The functions handle_new_user() / handle_user_email_confirmed() are
--    created by the baseline migration (public schema). These bindings are not.
-- ----------------------------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update on auth.users
  for each row execute function public.handle_user_email_confirmed();
