-- Public "likes" for community posts. A denormalised counter on the post plus a
-- SECURITY DEFINER increment RPC callable by anon (the public page has no auth),
-- so visitors can like without a profile row. Client dedupes via localStorage.
alter table public.community_posts
  add column if not exists like_count integer not null default 0;

-- Backfill from the legacy per-creator reactions table.
update public.community_posts p
   set like_count = (select count(*) from public.community_reactions r where r.post_id = p.id)
 where like_count = 0;

create or replace function public.increment_community_post_like(p_post_id uuid, p_delta integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
begin
  if p_delta not in (-1, 1) then
    raise exception 'invalid delta';
  end if;
  update public.community_posts
     set like_count = greatest(0, like_count + p_delta)
   where id = p_post_id
   returning like_count into new_count;
  return coalesce(new_count, 0);
end;
$$;

grant execute on function public.increment_community_post_like(uuid, integer) to anon, authenticated;
