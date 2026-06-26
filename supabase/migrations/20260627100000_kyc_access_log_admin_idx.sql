-- Audit query support: "what did admin X access, most recent first".
-- The creator-side index already exists; this adds the admin-side one.

create index if not exists kyc_access_log_admin_idx
  on public.kyc_access_log (admin_id, created_at desc);
