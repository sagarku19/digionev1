-- Storage metadata, repurposed. Consolidates the dead baseline file-metadata
-- subsystem (storage_files, storage_file_usages, media_library, product_files,
-- product_licenses) into ONE bucket-aware table, reusing the storage_files name
-- with a clean R2 shape. Also drops the now-unused storage_provider_type enum
-- and the unused creator_kyc URL/hash columns (KYC files are tracked here with
-- kind='kyc'; creator_kyc stays the status/level table). All these tables are
-- empty, so drop+recreate is safe (dev big-bang).

-- 1. Drop the dead subsystem (cascade clears FKs/indexes/policies).
drop table if exists public.storage_file_usages cascade;
drop table if exists public.media_library cascade;
drop table if exists public.product_files cascade;
drop table if exists public.product_licenses cascade;
drop table if exists public.storage_files cascade;

-- 2. Drop the now-unreferenced enum (only the old storage_files.provider used it).
drop type if exists public.storage_provider_type;

-- 3. Drop unused KYC URL/hash columns -- KYC files now live in storage_files.
alter table public.creator_kyc drop column if exists document_urls;
alter table public.creator_kyc drop column if exists document_hashes;

-- 4. Recreate storage_files as the single R2 object-metadata table. Writes are
--    service-role only (no creator INSERT/UPDATE policy) -> KYC immutability and
--    derivative integrity fall out for free. Owners SELECT their rows for status.
create table public.storage_files (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references public.profiles(id) on delete cascade,
  bucket         text not null,            -- digione-{kyc-private|products|media|public-assets}
  object_key     text not null,            -- {creator_id}/{...}/{ts}_{filename}
  file_name      text not null,
  mime_type      text,
  size           bigint not null default 0,
  visibility     text not null default 'private',  -- private | public
  kind           text not null default 'other',    -- cover|avatar|banner|linkinbio|gallery|deliverable|kyc|contract|other
  product_id     uuid references public.products(id) on delete set null,
  parent_file_id uuid references public.storage_files(id) on delete cascade,  -- set on a crop derivative
  crop           jsonb,                    -- {x,y,width,height,aspect,sourceUrl} for derivatives
  created_at     timestamptz not null default now(),
  deleted_at     timestamptz
);

create unique index storage_files_bucket_object_key_live_uniq
  on public.storage_files (bucket, object_key)
  where deleted_at is null;

create index storage_files_owner_bucket_live_idx
  on public.storage_files (owner_id, bucket)
  where deleted_at is null;

create index storage_files_parent_idx
  on public.storage_files (parent_file_id)
  where deleted_at is null;

create index storage_files_owner_product_idx
  on public.storage_files (owner_id, product_id)
  where deleted_at is null;

alter table public.storage_files enable row level security;

-- Owner may read their own rows (status display). No write policy: all
-- INSERT/UPDATE/DELETE go through service-role API routes.
create policy storage_files_owner_select on public.storage_files
  for select using (owner_id = public.current_profile_id());

-- super_admin read-everything (mirrors the rest of the schema).
create policy storage_files_admin_select on public.storage_files
  for select using (public.is_super_admin());
