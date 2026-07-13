-- Instagram Auto DM (Phase 1). Comment-to-DM automation with follow-gating.
-- 8 tables + 3 atomic RPCs. All instaauto_. No money tables touched.
-- Reads: profiles(id) as creator_id. RLS helpers: current_profile_id(), is_super_admin().

create extension if not exists citext;

-- ── instaauto_accounts ───────────────────────────────────────
create table if not exists public.instaauto_accounts (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  ig_user_id text unique,
  username text,
  access_token_enc text,
  token_expires_at timestamptz,
  scopes text[] not null default '{}',
  status text not null default 'active' check (status in ('active','expired','revoked')),
  is_simulated boolean not null default false,
  avatar_url text,
  connected_at timestamptz not null default now(),
  last_refreshed_at timestamptz
);
create index if not exists idx_instaauto_accounts_creator on public.instaauto_accounts (creator_id);
alter table public.instaauto_accounts enable row level security;
create policy instaauto_accounts_super_admin_select
  on public.instaauto_accounts for select to authenticated
  using (public.is_super_admin());

-- ── instaauto_automations ────────────────────────────────────
create table if not exists public.instaauto_automations (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  account_id uuid not null references public.instaauto_accounts(id) on delete cascade,
  name text not null default 'Untitled automation',
  status text not null default 'draft' check (status in ('draft','active','paused')),
  trigger_types text[] not null default '{}',
  match_mode text not null default 'exact' check (match_mode in ('exact','fuzzy','ai_intent','sentiment')),
  multilingual boolean not null default false,
  response_type text not null default 'message' check (response_type in ('message','smart_ai')),
  dm_payload jsonb not null default '{}'::jsonb,
  ai_prompt text,
  comment_reply text,
  media_scope text not null default 'all' check (media_scope in ('all','specific')),
  require_follow boolean not null default false,
  dm_count integer not null default 0,
  comment_count integer not null default 0,
  last_fired_at timestamptz,
  version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_instaauto_automations_account_status
  on public.instaauto_automations (account_id, status) where deleted_at is null;
create index if not exists idx_instaauto_automations_creator
  on public.instaauto_automations (creator_id);
alter table public.instaauto_automations enable row level security;
create policy instaauto_automations_owner_all
  on public.instaauto_automations for all to authenticated
  using (creator_id = public.current_profile_id())
  with check (creator_id = public.current_profile_id());
create policy instaauto_automations_super_admin_select
  on public.instaauto_automations for select to authenticated
  using (public.is_super_admin());

-- ── instaauto_keywords ───────────────────────────────────────
create table if not exists public.instaauto_keywords (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null references public.instaauto_automations(id) on delete cascade,
  word citext not null,
  is_negative boolean not null default false,
  constraint uq_instaauto_keywords_word unique (automation_id, word)
);
create index if not exists idx_instaauto_keywords_automation on public.instaauto_keywords (automation_id);
alter table public.instaauto_keywords enable row level security;
create policy instaauto_keywords_owner_all
  on public.instaauto_keywords for all to authenticated
  using (exists (select 1 from public.instaauto_automations a
                 where a.id = automation_id and a.creator_id = public.current_profile_id()))
  with check (exists (select 1 from public.instaauto_automations a
                      where a.id = automation_id and a.creator_id = public.current_profile_id()));

-- ── instaauto_media_targets ──────────────────────────────────
create table if not exists public.instaauto_media_targets (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null references public.instaauto_automations(id) on delete cascade,
  ig_media_id text not null,
  media_type text,
  thumbnail_url text,
  caption_snippet text
);
create index if not exists idx_instaauto_media_targets_automation on public.instaauto_media_targets (automation_id);
alter table public.instaauto_media_targets enable row level security;
create policy instaauto_media_targets_owner_all
  on public.instaauto_media_targets for all to authenticated
  using (exists (select 1 from public.instaauto_automations a
                 where a.id = automation_id and a.creator_id = public.current_profile_id()))
  with check (exists (select 1 from public.instaauto_automations a
                      where a.id = automation_id and a.creator_id = public.current_profile_id()));

-- ── instaauto_events ─────────────────────────────────────────
create table if not exists public.instaauto_events (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  account_id uuid not null references public.instaauto_accounts(id) on delete cascade,
  automation_id uuid references public.instaauto_automations(id) on delete set null,
  event_type text not null check (event_type in ('comment','dm','story_reply','story_mention','postback')),
  ig_user_id text,
  ig_username text,
  matched_keyword text,
  dedup_key text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create unique index if not exists uq_instaauto_events_dedup
  on public.instaauto_events (dedup_key) where dedup_key is not null;
create index if not exists idx_instaauto_events_account_created
  on public.instaauto_events (account_id, created_at desc);
alter table public.instaauto_events enable row level security;
create policy instaauto_events_owner_select
  on public.instaauto_events for select to authenticated
  using (creator_id = public.current_profile_id());
create policy instaauto_events_super_admin_select
  on public.instaauto_events for select to authenticated
  using (public.is_super_admin());

-- ── instaauto_messages (record + queue) ──────────────────────
create table if not exists public.instaauto_messages (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  automation_id uuid references public.instaauto_automations(id) on delete set null,
  account_id uuid not null references public.instaauto_accounts(id) on delete cascade,
  event_id uuid references public.instaauto_events(id) on delete set null,
  recipient_ig_user_id text,
  recipient_username text,
  message_type text not null check (message_type in ('dm','private_reply','comment_reply')),
  message_text text,
  payload_snapshot jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued','processing','sent','failed')),
  simulated boolean not null default false,
  attempts integer not null default 0,
  send_after timestamptz not null default now(),
  last_attempt_at timestamptz,
  last_error text,
  ig_comment_id text,
  ig_message_id text,
  created_at timestamptz not null default now(),
  constraint uq_instaauto_messages_event_type unique (event_id, message_type)
);
create index if not exists idx_instaauto_messages_status_sendafter
  on public.instaauto_messages (status, send_after);
create index if not exists idx_instaauto_messages_account_status
  on public.instaauto_messages (account_id, status);
create index if not exists idx_instaauto_messages_comment
  on public.instaauto_messages (ig_comment_id) where ig_comment_id is not null;
create index if not exists idx_instaauto_messages_creator_created
  on public.instaauto_messages (creator_id, created_at desc);
alter table public.instaauto_messages enable row level security;
create policy instaauto_messages_owner_select
  on public.instaauto_messages for select to authenticated
  using (creator_id = public.current_profile_id());
create policy instaauto_messages_super_admin_select
  on public.instaauto_messages for select to authenticated
  using (public.is_super_admin());

-- ── instaauto_message_attempts (append-only) ─────────────────
create table if not exists public.instaauto_message_attempts (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.instaauto_messages(id) on delete cascade,
  attempt_no integer not null,
  outcome text not null check (outcome in ('success','retryable_error','terminal_error')),
  provider text not null check (provider in ('real','simulated')),
  error_code text,
  error_message text,
  http_status integer,
  created_at timestamptz not null default now()
);
create index if not exists idx_instaauto_message_attempts_message
  on public.instaauto_message_attempts (message_id, attempt_no);
alter table public.instaauto_message_attempts enable row level security;
create policy instaauto_message_attempts_owner_select
  on public.instaauto_message_attempts for select to authenticated
  using (exists (select 1 from public.instaauto_messages m
                 where m.id = message_id and m.creator_id = public.current_profile_id()));

-- ── instaauto_leads (CRM) ────────────────────────────────────
create table if not exists public.instaauto_leads (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  account_id uuid not null references public.instaauto_accounts(id) on delete cascade,
  ig_user_id text not null,
  ig_username text,
  first_source text,
  first_automation_id uuid references public.instaauto_automations(id) on delete set null,
  email text,
  is_follower boolean,
  follow_checked_at timestamptz,
  last_user_message_at timestamptz,
  interaction_count integer not null default 0,
  created_at timestamptz not null default now(),
  constraint uq_instaauto_leads_creator_iguser unique (creator_id, ig_user_id)
);
create index if not exists idx_instaauto_leads_account_iguser
  on public.instaauto_leads (account_id, ig_user_id);
alter table public.instaauto_leads enable row level security;
create policy instaauto_leads_owner_select
  on public.instaauto_leads for select to authenticated
  using (creator_id = public.current_profile_id());
create policy instaauto_leads_super_admin_select
  on public.instaauto_leads for select to authenticated
  using (public.is_super_admin());

-- ── RPC: claim (FOR UPDATE SKIP LOCKED) ──────────────────────
create or replace function public.instaauto_claim_messages(p_account_id uuid, p_limit int)
returns setof public.instaauto_messages
language plpgsql security definer set search_path = public as $$
begin
  return query
  with candidates as (
    select id from public.instaauto_messages
     where account_id = p_account_id and status = 'queued' and send_after <= now()
     order by send_after asc
     limit p_limit
     for update skip locked
  ), claimed as (
    update public.instaauto_messages m
       set status = 'processing', attempts = m.attempts + 1, last_attempt_at = now()
      from candidates c
     where m.id = c.id
    returning m.*
  )
  select * from claimed;
end; $$;

-- ── RPC: finalize_send (atomic sent + counter + lead + attempt) ─
create or replace function public.instaauto_finalize_send(
  p_message_id uuid, p_ig_message_id text, p_provider text,
  p_is_follower boolean, p_follow_checked_at timestamptz
) returns boolean
language plpgsql security definer set search_path = public as $$
declare m public.instaauto_messages;
begin
  select * into m from public.instaauto_messages where id = p_message_id and status = 'processing' for update;
  if not found then return false; end if;

  update public.instaauto_messages
     set status = 'sent', ig_message_id = p_ig_message_id,
         simulated = (p_provider = 'simulated'), last_error = null
   where id = p_message_id;

  update public.instaauto_automations
     set dm_count = dm_count + case when m.message_type in ('dm','private_reply') then 1 else 0 end,
         comment_count = comment_count + case when m.message_type = 'comment_reply' then 1 else 0 end,
         last_fired_at = now()
   where id = m.automation_id;

  update public.instaauto_leads
     set interaction_count = interaction_count + 1,
         is_follower = coalesce(p_is_follower, is_follower),
         follow_checked_at = coalesce(p_follow_checked_at, follow_checked_at)
   where creator_id = m.creator_id and ig_user_id = m.recipient_ig_user_id;

  insert into public.instaauto_message_attempts (message_id, attempt_no, outcome, provider)
  values (p_message_id, m.attempts, 'success', p_provider);
  return true;
end; $$;

-- ── RPC: fail_send (attempt log + requeue/terminal + optional revoke) ─
create or replace function public.instaauto_fail_send(
  p_message_id uuid, p_outcome text, p_error_code text, p_error_message text,
  p_http_status int, p_terminal boolean, p_backoff_seconds int, p_revoke_account boolean
) returns text
language plpgsql security definer set search_path = public as $$
declare m public.instaauto_messages;
begin
  select * into m from public.instaauto_messages where id = p_message_id and status = 'processing' for update;
  if not found then return 'noop'; end if;

  insert into public.instaauto_message_attempts
    (message_id, attempt_no, outcome, provider, error_code, error_message, http_status)
  values (p_message_id, m.attempts, p_outcome, 'real', p_error_code, left(p_error_message, 500), p_http_status);

  if p_terminal then
    update public.instaauto_messages set status = 'failed', last_error = left(p_error_message, 500) where id = p_message_id;
  else
    update public.instaauto_messages
       set status = 'queued', send_after = now() + make_interval(secs => p_backoff_seconds),
           last_error = left(p_error_message, 500)
     where id = p_message_id;
  end if;

  if p_revoke_account then
    update public.instaauto_accounts set status = 'revoked' where id = m.account_id;
    update public.instaauto_messages set status = 'failed', last_error = 'account_revoked'
     where account_id = m.account_id and status = 'queued';
  end if;
  return case when p_terminal then 'failed' else 'requeued' end;
end; $$;

revoke execute on function public.instaauto_claim_messages(uuid, int) from public, anon, authenticated;
revoke execute on function public.instaauto_finalize_send(uuid, text, text, boolean, timestamptz) from public, anon, authenticated;
revoke execute on function public.instaauto_fail_send(uuid, text, text, text, int, boolean, int, boolean) from public, anon, authenticated;
