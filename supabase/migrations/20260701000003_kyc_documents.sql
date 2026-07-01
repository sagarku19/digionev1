-- Phase 2 — kyc_documents (2026-07-01)
-- Spec: docs/superpowers/specs/2026-07-01-phase2-kyc-verification-design.md
-- Links an uploaded storage_files object (kind='kyc', bucket=creator-private) to a creator's KYC,
-- tagged by doc_type. Creator inserts/reads own; super_admin reads all; no client UPDATE/DELETE.
create table if not exists public.kyc_documents (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  file_id uuid not null references public.storage_files(id) on delete cascade,
  doc_type text not null check (doc_type in ('pan_card','bank_proof','aadhaar')),
  created_at timestamptz not null default now()
);
create index if not exists idx_kyc_documents_creator on public.kyc_documents(creator_id);

alter table public.kyc_documents enable row level security;
drop policy if exists kyc_documents_select_own on public.kyc_documents;
create policy kyc_documents_select_own on public.kyc_documents
  for select to authenticated using (creator_id = public.current_profile_id() or (select public.is_super_admin()));
drop policy if exists kyc_documents_insert_own on public.kyc_documents;
create policy kyc_documents_insert_own on public.kyc_documents
  for insert to authenticated with check (creator_id = public.current_profile_id());
