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


# stiill need to run and fix auto DM Page