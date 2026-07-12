-- Short Links (Phase 1): creator-owned URL shortener on a dedicated domain.
-- Tables: linksh_links (the link), linksh_click_events (raw click log).
-- RPC: linksh_record_click (atomic + idempotent click recording).

-- ── linksh_links ─────────────────────────────────────────────
create table if not exists public.linksh_links (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  code text not null unique,
  destination_url text not null,
  title text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  tags text[] not null default '{}',
  is_active boolean not null default true,
  expires_at timestamptz,
  expired_redirect_url text,
  click_count bigint not null default 0,
  unique_click_count bigint not null default 0,
  last_clicked_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_linksh_links_creator
  on public.linksh_links (creator_id, created_at desc);
create index if not exists idx_linksh_links_tags
  on public.linksh_links using gin (tags);

alter table public.linksh_links enable row level security;

create policy linksh_links_owner_all
  on public.linksh_links for all to authenticated
  using (creator_id = public.current_profile_id())
  with check (creator_id = public.current_profile_id());

create policy linksh_links_super_admin_select
  on public.linksh_links for select to authenticated
  using (public.is_super_admin());

-- ── linksh_click_events ──────────────────────────────────────
create table if not exists public.linksh_click_events (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references public.linksh_links(id) on delete cascade,
  creator_id uuid not null references public.profiles(id) on delete cascade,
  ip_hash text,
  country text,
  device_type text,
  browser text,
  os text,
  referrer_url text,
  user_agent text,
  resolved_destination_url text,
  dedup_hash text not null,
  is_unique boolean not null default false,
  created_at timestamptz not null default now(),
  constraint uq_linksh_click_events_dedup unique (dedup_hash)
);

create index if not exists idx_linksh_click_events_link_created
  on public.linksh_click_events (link_id, created_at desc);
create index if not exists idx_linksh_click_events_creator
  on public.linksh_click_events (creator_id);

alter table public.linksh_click_events enable row level security;

create policy linksh_click_events_select_owner
  on public.linksh_click_events for select to authenticated
  using (creator_id = public.current_profile_id());

create policy linksh_click_events_super_admin_select
  on public.linksh_click_events for select to authenticated
  using (public.is_super_admin());

-- ── RPC: atomic + idempotent click recording ─────────────────
create or replace function public.linksh_record_click(
  p_link_id uuid,
  p_creator_id uuid,
  p_ip_hash text,
  p_country text,
  p_device_type text,
  p_browser text,
  p_os text,
  p_referrer_url text,
  p_user_agent text,
  p_resolved_destination_url text,
  p_dedup_hash text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_unique boolean;
  v_inserted_id uuid;
begin
  select not exists (
    select 1 from public.linksh_click_events
    where link_id = p_link_id and ip_hash = p_ip_hash
  ) into v_is_unique;

  insert into public.linksh_click_events (
    link_id, creator_id, ip_hash, country, device_type, browser, os,
    referrer_url, user_agent, resolved_destination_url, dedup_hash, is_unique
  ) values (
    p_link_id, p_creator_id, p_ip_hash, p_country, p_device_type, p_browser, p_os,
    p_referrer_url, p_user_agent, p_resolved_destination_url, p_dedup_hash,
    coalesce(v_is_unique, true)
  )
  on conflict (dedup_hash) do nothing
  returning id into v_inserted_id;

  if v_inserted_id is null then
    return false;  -- duplicate delivery, do not count
  end if;

  update public.linksh_links
  set click_count = click_count + 1,
      unique_click_count = unique_click_count + case when v_is_unique then 1 else 0 end,
      last_clicked_at = now()
  where id = p_link_id;

  return true;
end;
$$;

revoke execute on function public.linksh_record_click(
  uuid, uuid, text, text, text, text, text, text, text, text, text
) from public, anon, authenticated;
