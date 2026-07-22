-- One community per creator: public identity (name + unique handle) for the
-- public community page at /community/[handle]. Posts stay keyed on creator_id.
create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null unique references public.profiles(id) on delete cascade,
  name text not null,
  username text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint communities_username_format
    check (username ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$')
);

create unique index if not exists ux_communities_username_lower
  on public.communities (lower(username));

alter table public.communities enable row level security;

-- Anyone (anon or authenticated) can view a community page.
drop policy if exists communities_select_public on public.communities;
create policy communities_select_public on public.communities
  for select to anon, authenticated using (true);

-- A creator may create their own community row.
drop policy if exists communities_insert_own on public.communities;
create policy communities_insert_own on public.communities
  for insert to authenticated
  with check (creator_id = (select public.current_profile_id()));

-- A creator may edit only their own community.
drop policy if exists communities_update_own on public.communities;
create policy communities_update_own on public.communities
  for update to authenticated
  using (creator_id = (select public.current_profile_id()))
  with check (creator_id = (select public.current_profile_id()));
