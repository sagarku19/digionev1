-- Create creator-public bucket. Replaces the products bucket which held only
-- product covers; creator-public expands the contract to all creator-uploaded
-- public images via a {kind} subfolder: cover, linkinbio, avatar, banner, other.
-- Path: creator-public/{creator_id}/{kind}/{ts}_{filename}
-- Public, 5MB cap, image MIMEs incl. SVG/ICO for favicons.
--
-- The companion products-bucket DROP cannot be done via SQL because Supabase's
-- storage.protect_delete trigger blocks direct DELETE on storage.buckets.
-- Drop is done out-of-band via the Storage Management API:
--   DELETE https://{project}.supabase.co/storage/v1/bucket/products
--   with the service-role key as Bearer + apikey.
-- For a fresh rebuild the storage-and-auth.sql export already omits 'products'
-- from the bucket INSERT block, so this migration is sufficient there too.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'creator-public',
  'creator-public',
  true,
  5242880,
  array['image/png','image/jpeg','image/webp','image/gif','image/svg+xml','image/x-icon']
)
on conflict (id) do nothing;
