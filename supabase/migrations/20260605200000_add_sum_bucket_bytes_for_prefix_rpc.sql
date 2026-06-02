-- Sum bytes of all objects in a Supabase Storage bucket under a given path prefix.
-- Used by /api/upload to enforce per-creator storage quota on creator-content
-- without granting the service-role client direct SELECT on storage.objects in
-- the route (helper functions keep the surface minimal).
--
-- Returns 0 if no matching objects.

create or replace function public.sum_bucket_bytes_for_prefix(
  p_bucket_id text,
  p_prefix    text
) returns bigint
language sql
stable
security definer
set search_path = public, storage
as $$
  select coalesce(sum((metadata->>'size')::bigint), 0)
  from storage.objects
  where bucket_id = p_bucket_id
    and name like p_prefix || '%';
$$;

-- service_role + authenticated can call. Anon does not need this.
revoke all on function public.sum_bucket_bytes_for_prefix(text, text) from public;
grant execute on function public.sum_bucket_bytes_for_prefix(text, text) to service_role;
grant execute on function public.sum_bucket_bytes_for_prefix(text, text) to authenticated;
