-- Create products storage bucket.
-- public: true → public reads work without RLS policies.
-- 5MB limit + image MIME allowlist mirror the public-asset bucket.
-- RLS policies intentionally deferred — service_role writes via /api/upload bypass RLS;
-- public reads work via the public: true flag without any policy.
-- TODO when auth gate lands: add authenticated-insert/update/delete policies scoped to
--   (storage.foldername(name))[1] = profiles.id for the calling user.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'products',
  'products',
  true,
  5242880,
  array['image/png','image/jpeg','image/webp','image/gif']
)
on conflict (id) do nothing;
