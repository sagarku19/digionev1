-- Mandatory audit trail for admin KYC downloads. R2 has no native per-object
-- access log. Every mint of a KYC signed URL writes a row here. Writes are
-- service-role only; super_admins may read.

create table if not exists public.kyc_access_log (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid not null references auth.users(id),
  creator_id  uuid not null references public.profiles(id) on delete cascade,
  file_id     uuid references public.storage_files(id) on delete set null,
  object_key  text not null,
  created_at  timestamptz not null default now()
);

create index if not exists kyc_access_log_creator_idx on public.kyc_access_log (creator_id, created_at desc);

alter table public.kyc_access_log enable row level security;

drop policy if exists kyc_access_log_admin_select on public.kyc_access_log;
create policy kyc_access_log_admin_select on public.kyc_access_log
  for select using (public.is_super_admin());
