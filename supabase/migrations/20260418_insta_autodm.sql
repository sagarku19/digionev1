-- Enable UUID
create extension if not exists "pgcrypto";

-- =========================
-- ENUMS
-- =========================

do $$ begin
  create type insta_subscription_plan as enum ('PRO', 'FREE');
exception when duplicate_object then null; end $$;

do $$ begin
  create type insta_listeners_enum as enum ('SMARTAI', 'MESSAGE');
exception when duplicate_object then null; end $$;

do $$ begin
  create type insta_media_type as enum ('IMAGE', 'VIDEO', 'CAROSEL_ALBUM');
exception when duplicate_object then null; end $$;

-- =========================
-- INSTA USERS
-- =========================

create table if not exists public.insta_users (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null,
  username text not null,
  username_verified boolean default false,
  instagram_id text unique,
  access_token text,
  refresh_token text,
  created_at timestamptz default now(),
  constraint fk_insta_profile
    foreign key (profile_id) references public.profiles(id) on delete cascade
);

create index if not exists idx_insta_users_profile on public.insta_users(profile_id);
create index if not exists idx_insta_users_username on public.insta_users(username);

-- =========================
-- SUBSCRIPTIONS
-- =========================

create table if not exists public.insta_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique not null,
  plan insta_subscription_plan default 'FREE',
  customer_id text unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint fk_insta_subscription_profile
    foreign key (profile_id) references public.profiles(id) on delete cascade
);

-- =========================
-- AUTOMATIONS
-- =========================

create table if not exists public.insta_automations (
  id uuid primary key default gen_random_uuid(),
  insta_user_id uuid not null,
  name text default 'Untitled',
  active boolean default false,
  created_at timestamptz default now(),
  constraint fk_insta_user_automation
    foreign key (insta_user_id) references public.insta_users(id) on delete cascade
);

create index if not exists idx_insta_automations_user on public.insta_automations(insta_user_id);

-- =========================
-- KEYWORDS
-- =========================

create table if not exists public.insta_keywords (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null,
  word text not null,
  constraint fk_insta_keyword_automation
    foreign key (automation_id) references public.insta_automations(id) on delete cascade,
  constraint unique_insta_keyword_per_automation unique (automation_id, word)
);

create index if not exists idx_insta_keywords_automation on public.insta_keywords(automation_id);

-- =========================
-- TRIGGERS
-- =========================

create table if not exists public.insta_triggers (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null,
  type text not null,
  constraint fk_insta_trigger_automation
    foreign key (automation_id) references public.insta_automations(id) on delete cascade
);

-- =========================
-- LISTENERS
-- =========================

create table if not exists public.insta_listeners (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid unique not null,
  listener insta_listeners_enum default 'MESSAGE',
  prompt text not null,
  comment_reply text,
  dm_count int default 0,
  comment_count int default 0,
  constraint fk_insta_listener_automation
    foreign key (automation_id) references public.insta_automations(id) on delete cascade
);

-- =========================
-- POSTS
-- =========================

create table if not exists public.insta_posts (
  id uuid primary key default gen_random_uuid(),
  post_id text not null,
  caption text,
  media text not null,
  media_type insta_media_type default 'IMAGE',
  automation_id uuid,
  constraint fk_insta_post_automation
    foreign key (automation_id) references public.insta_automations(id) on delete cascade
);

-- =========================
-- DMS
-- =========================

create table if not exists public.insta_dms (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid,
  sender_id text,
  receiver text,
  message text,
  created_at timestamptz default now(),
  constraint fk_insta_dms_automation
    foreign key (automation_id) references public.insta_automations(id) on delete set null
);

create index if not exists idx_insta_dms_automation on public.insta_dms(automation_id);

-- =========================
-- LEADS
-- =========================

create table if not exists public.insta_leads (
  id uuid primary key default gen_random_uuid(),
  insta_user_id uuid,
  ig_user_id text,
  username text,
  source text,
  created_at timestamptz default now(),
  constraint fk_insta_lead_user
    foreign key (insta_user_id) references public.insta_users(id) on delete cascade
);

create index if not exists idx_insta_leads_user on public.insta_leads(insta_user_id);

-- =========================
-- WEBHOOK EVENTS (for debugging/auditing)
-- =========================

create table if not exists public.insta_webhook_events (
  id uuid primary key default gen_random_uuid(),
  insta_user_id uuid,
  event_type text,
  payload jsonb,
  processed boolean default false,
  created_at timestamptz default now(),
  constraint fk_insta_webhook_user
    foreign key (insta_user_id) references public.insta_users(id) on delete set null
);

create index if not exists idx_insta_webhook_user on public.insta_webhook_events(insta_user_id);
create index if not exists idx_insta_webhook_created on public.insta_webhook_events(created_at desc);

-- ============================================================================
-- RLS — Instagram auto-DM tables (private creator feature, no public read)
-- ============================================================================
-- Ownership anchor: insta_users.profile_id = profiles.id (the creator).
-- All other tables resolve ownership through their FK chain to insta_users.
-- Webhook events are written by the Instagram webhook (service-role), so the
-- creator gets read-only there. service_role bypasses RLS for all writes.
--
-- Helper is (re)created defensively so this file is self-contained even if the
-- main RLS migration (20260602000000_rls_policies.sql) hasn't run yet.
-- ----------------------------------------------------------------------------
create or replace function public.current_profile_id()
returns uuid language sql stable security definer set search_path = public as $fn$
  select id from public.profiles where user_id = auth.uid() limit 1;
$fn$;
revoke all on function public.current_profile_id() from public;
grant execute on function public.current_profile_id() to authenticated, anon, service_role;

-- insta_users: creator manages own.
alter table public.insta_users enable row level security;
drop policy if exists insta_users_all_own on public.insta_users;
create policy insta_users_all_own on public.insta_users
  for all to authenticated
  using (profile_id = public.current_profile_id())
  with check (profile_id = public.current_profile_id());

-- insta_subscriptions: creator reads/manages own.
alter table public.insta_subscriptions enable row level security;
drop policy if exists insta_subscriptions_all_own on public.insta_subscriptions;
create policy insta_subscriptions_all_own on public.insta_subscriptions
  for all to authenticated
  using (profile_id = public.current_profile_id())
  with check (profile_id = public.current_profile_id());

-- insta_automations → insta_users
alter table public.insta_automations enable row level security;
drop policy if exists insta_automations_all_own on public.insta_automations;
create policy insta_automations_all_own on public.insta_automations
  for all to authenticated
  using (exists (select 1 from public.insta_users u
                 where u.id = insta_user_id and u.profile_id = public.current_profile_id()))
  with check (exists (select 1 from public.insta_users u
                 where u.id = insta_user_id and u.profile_id = public.current_profile_id()));

-- insta_keywords / insta_triggers / insta_listeners / insta_posts / insta_dms → insta_automations → insta_users
do $rls$
declare t text;
begin
  foreach t in array array['insta_keywords','insta_triggers','insta_listeners','insta_posts','insta_dms']
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists %I on public.%I;', t||'_all_own', t);
    execute format($p$create policy %I on public.%I for all to authenticated
      using (exists (select 1 from public.insta_automations a
                     join public.insta_users u on u.id = a.insta_user_id
                     where a.id = %I.automation_id and u.profile_id = public.current_profile_id()))
      with check (exists (select 1 from public.insta_automations a
                     join public.insta_users u on u.id = a.insta_user_id
                     where a.id = %I.automation_id and u.profile_id = public.current_profile_id()));$p$,
      t||'_all_own', t, t, t);
  end loop;
end $rls$;

-- insta_leads → insta_users (creator reads; insert via webhook service-role)
alter table public.insta_leads enable row level security;
drop policy if exists insta_leads_select_own on public.insta_leads;
create policy insta_leads_select_own on public.insta_leads
  for select to authenticated
  using (exists (select 1 from public.insta_users u
                 where u.id = insta_user_id and u.profile_id = public.current_profile_id()));

-- insta_webhook_events → insta_users (creator read-only; writes service-role)
alter table public.insta_webhook_events enable row level security;
drop policy if exists insta_webhook_events_select_own on public.insta_webhook_events;
create policy insta_webhook_events_select_own on public.insta_webhook_events
  for select to authenticated
  using (exists (select 1 from public.insta_users u
                 where u.id = insta_user_id and u.profile_id = public.current_profile_id()));

-- still need to run and fix auto DM Page (pending feature — see SUPABASE.md)