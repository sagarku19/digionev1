-- linkinbio_analytics: written by /api/linkinbio/track (service role), read by site owner
create table public.linkinbio_analytics (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  link_id uuid references public.linkinbio_items(id) on delete set null,
  event_type text not null check (event_type in ('page_view','link_click','product_click','social_click')),
  referrer_url text,
  user_agent text,
  ip_hash text,
  created_at timestamptz not null default now()
);

create index idx_linkinbio_analytics_site_created
  on public.linkinbio_analytics (site_id, created_at desc);
create index idx_linkinbio_analytics_dedupe
  on public.linkinbio_analytics (site_id, link_id, ip_hash, created_at);

alter table public.linkinbio_analytics enable row level security;

create policy linkinbio_analytics_select_owner
  on public.linkinbio_analytics for select to authenticated
  using (exists (
    select 1 from public.sites s
    where s.id = linkinbio_analytics.site_id
      and s.creator_id = public.current_profile_id()
  ));
-- no insert/update/delete policies: service-role writes only

create or replace function public.increment_link_click_count(p_link_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.linkinbio_items
  set click_count = coalesce(click_count, 0) + 1
  where id = p_link_id;
$$;
revoke execute on function public.increment_link_click_count(uuid) from public, anon, authenticated;

-- ab_tests: minimal shape matching src/hooks/useAbTests.ts (creator-owned)
create table public.ab_tests (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  name text not null,
  status text not null default 'draft',
  variant_a jsonb,
  variant_b jsonb,
  created_at timestamptz not null default now()
);

create index idx_ab_tests_creator on public.ab_tests (creator_id);

alter table public.ab_tests enable row level security;

create policy ab_tests_owner_all
  on public.ab_tests for all to authenticated
  using (creator_id = public.current_profile_id())
  with check (creator_id = public.current_profile_id());
