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
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('public-asset', 'public-asset', true, 5242880, null),
  ('uploads',      'uploads',      true, null,    null),
  ('user_files',   'user_files',   true, null,    null)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ----------------------------------------------------------------------------
-- 2. STORAGE RLS POLICIES on storage.objects
--    (storage.objects already has RLS enabled by Supabase)
-- ----------------------------------------------------------------------------
drop policy if exists "Creators can manage own files" on storage.objects;
create policy "Creators can manage own files" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'uploads'
    and (storage.foldername(name))[2] = (
      select profiles.id::text from profiles where profiles.user_id = auth.uid()
    )
  );

drop policy if exists "Creators can upload own files" on storage.objects;
create policy "Creators can upload own files" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'uploads'
    and (storage.foldername(name))[1] = 'creators'
    and (storage.foldername(name))[2] = (
      select profiles.id::text from profiles where profiles.user_id = auth.uid()
    )
  );

drop policy if exists "Public read access" on storage.objects;
create policy "Public read access" on storage.objects
  for select to public using (bucket_id = 'uploads');

-- public-asset bucket — full public control
drop policy if exists "FULL Control 1pl33po_0" on storage.objects;
create policy "FULL Control 1pl33po_0" on storage.objects for select to public using (bucket_id = 'public-asset');
drop policy if exists "FULL Control 1pl33po_1" on storage.objects;
create policy "FULL Control 1pl33po_1" on storage.objects for insert to public with check (bucket_id = 'public-asset');
drop policy if exists "FULL Control 1pl33po_2" on storage.objects;
create policy "FULL Control 1pl33po_2" on storage.objects for update to public using (bucket_id = 'public-asset');
drop policy if exists "FULL Control 1pl33po_3" on storage.objects;
create policy "FULL Control 1pl33po_3" on storage.objects for delete to public using (bucket_id = 'public-asset');

-- user_files bucket — full public control
drop policy if exists "all vslhqb_0" on storage.objects;
create policy "all vslhqb_0" on storage.objects for select to public using (bucket_id = 'user_files');
drop policy if exists "all vslhqb_1" on storage.objects;
create policy "all vslhqb_1" on storage.objects for insert to public with check (bucket_id = 'user_files');
drop policy if exists "all vslhqb_2" on storage.objects;
create policy "all vslhqb_2" on storage.objects for update to public using (bucket_id = 'user_files');
drop policy if exists "all vslhqb_3" on storage.objects;
create policy "all vslhqb_3" on storage.objects for delete to public using (bucket_id = 'user_files');

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
