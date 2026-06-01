-- Backfill auth.users.raw_app_meta_data.role from public.users.role for every
-- existing user. One-time, idempotent (skips users already mirrored).
-- See docs/superpowers/specs/2026-06-01-proxy-perf-and-role-storage-design.md §6.4.

UPDATE auth.users au
SET raw_app_meta_data = COALESCE(au.raw_app_meta_data, '{}'::jsonb)
                      || jsonb_build_object('role', pu.role)
FROM public.users pu
WHERE pu.auth_provider_id = au.id
  AND (au.raw_app_meta_data->>'role') IS NULL
  AND pu.role IS NOT NULL;
