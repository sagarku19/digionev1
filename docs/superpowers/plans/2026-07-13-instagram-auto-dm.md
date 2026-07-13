---
noteId: "c35809c07e7b11f1b7ddffeec518d7f9"
tags: []

---

# Instagram Auto DM (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static `/dashboard/autodm` prototype with a real, API-backed Instagram comment-to-DM + follow-gating automation feature, fully demoable today via a simulate (demo-account) path while Meta App Review is pending.

**Architecture:** Event-driven queue. An HMAC-verified webhook (or the simulate route) feeds a shared server-side pipeline that matches keywords, applies follow-gating, and enqueues `instaauto_messages` rows. A hybrid drainer (`after()` fast-path + `CRON_SECRET` cron) claims rows with `FOR UPDATE SKIP LOCKED`, sends via a real/simulated provider switch, and settles through atomic RPCs. Dashboard reads via RLS TanStack hooks; account/token ops stay behind API routes so the encrypted token never reaches the client.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Supabase (Postgres + RLS), TanStack Query v5, `next/server` `after()`, Node `crypto` (AES-256-GCM + HMAC), Meta Instagram Graph API via plain `fetch`, vitest.

**Spec:** `docs/superpowers/specs/2026-07-13-instagram-auto-dm-design.md`
**Branch:** `feat/instagram-auto-dm` (already checked out; user merges to `main`).

---

## Conventions (read once)

- **Server client:** `createServiceClient()` from `@/lib/supabase/service` (bypasses RLS — routes/pipeline only).
- **Auth in routes:** `const supabase = await createClient()` from `@/lib/supabase/server`; `supabase.auth.getUser()`; then `resolveProfileId(user.id, user.email)` from `@/lib/server/resolve-profile`.
- **Rate limit:** `rateLimitKey(key, { max, windowSeconds })` from `@/lib/server/rate-limit` (fail-open).
- **Hooks:** browser client `supabase` from `@/lib/supabase/client`; `getCreatorProfileId()` from `@/lib/getCreatorProfileId`; TanStack Query keys `['instaauto', ...]`.
- **No** `console.log` in shipped code (`console.error`/`console.warn` only, as existing routes do). **No** `any` on DB rows — use `Database['public']['Tables'][...]`.
- **DB changes** go through the Supabase MCP `apply_migration`, then `npm run update-types`. The Windows Supabase CLI is broken — do not run `supabase db push`.
- Commit after every task with the message shown in its final step.

---

## File Structure

**Migration**
- Create `supabase/migrations/20260713140000_instaauto_phase1.sql` — 8 tables + indexes + RLS + 3 RPCs (also applied via MCP).

**Server libs — `src/lib/server/instaauto/`** (each one file, one responsibility)
- `constants.ts` — `MAX_ATTEMPTS`, batch sizes, scopes, API version.
- `types.ts` — `InboundEvent`, `ResolvedPayload`, `SendResult`, `SendError`.
- `token-crypto.ts` — AES-256-GCM encrypt/decrypt for the IG token (own key).
- `keyword-match.ts` — exact/fuzzy match + negative-keyword veto.
- `payload.ts` — resolve `dm_payload` + `{name}` substitution → `payload_snapshot`.
- `dedup.ts` — build `instaauto_events.dedup_key`.
- `backoff.ts` — retry backoff schedule + `classifyError` (retryable/terminal/OAuth).
- `webhook-verify.ts` — `X-Hub-Signature-256` timing-safe HMAC verify.
- `event-parse.ts` — Meta webhook envelope → `InboundEvent[]`.
- `graph.ts` — Meta Graph calls (OAuth exchange/refresh, subscribe, profile, send).
- `send.ts` — window check + provider switch (real/simulated) + `sendOneMessage`.
- `pipeline.ts` — shared inbound processing (match → event → follow-gate → enqueue + lead upsert).
- `drain.ts` — `drainAccount(db, accountId, limit)` (claim → send → finalize/fail).
- `subscribe.ts` — subscribe/unsubscribe an account's webhook fields.

**API routes — `app/api/`**
- `instaauto/connect/route.ts` (GET), `instaauto/callback/route.ts` (GET)
- `instaauto/account/route.ts` (GET), `instaauto/account/demo/route.ts` (POST), `instaauto/account/disconnect/route.ts` (POST)
- `instaauto/simulate/route.ts` (POST), `instaauto/drain/route.ts` (POST), `instaauto/maintenance/route.ts` (POST)
- `webhook/instagram/route.ts` (GET verify + POST)

**Hooks — `src/hooks/instaauto/`**
- `useInstaAccount.ts`, `useInstaAutomations.ts`, `useInstaLeads.ts`, `useInstaMessages.ts`, `useInstaAnalytics.ts`

**UI — `src/components/dashboard/autodm/`** (extracted from the prototype) + rewired `app/dashboard/autodm/page.tsx`

**Docs/config (modify)**
- `.claude/rules/env-vars.md`, `.env.example`, `.claude/rules/api-routes.md`, `docs/reference/dashboard-map.md`, `.claude/todo-later/8(half)-2026-06-15-dashboard-health-findings.md`, `types/database.types.ts` (regenerated).

**Tests (colocated `*.test.ts`)** for every `src/lib/server/instaauto/` pure-logic module.

---

## Milestone 0 — Env & docs scaffold

### Task 0.1: Add env vars to docs + example

**Files:**
- Modify: `.claude/rules/env-vars.md`
- Modify: `.env.example`

- [ ] **Step 1: Add an Instagram Auto DM section to `env-vars.md`**

Add after the "Email (Resend)" section:

```markdown
## Instagram Auto DM (`instaauto_`)

Instagram automation. All server-only except none are public. Read by `src/lib/server/instaauto/*` and the `/api/instaauto/*` + `/api/webhook/instagram` routes. When `INSTAGRAM_APP_ID` is unset, real OAuth connect is disabled but demo (simulated) accounts still work end-to-end.

| Var | Scope | Used in | Notes |
|---|---|---|---|
| `INSTAGRAM_APP_ID` | server | `instaauto/connect`, `instaauto/callback`, `src/lib/server/instaauto/graph.ts` | Meta app ID (OAuth). Unset → real connect returns `not_configured`. |
| `INSTAGRAM_APP_SECRET` | **secret** | `instaauto/callback`, `graph.ts`, `webhook/instagram` | OAuth token exchange **and** the webhook `X-Hub-Signature-256` HMAC key. |
| `INSTAGRAM_WEBHOOK_VERIFY_TOKEN` | **secret** | `webhook/instagram` (GET) | Echoed against `hub.verify_token` during subscription verification. |
| `INSTAAUTO_TOKEN_ENCRYPTION_KEY` | **secret** | `src/lib/server/instaauto/token-crypto.ts` | base64-encoded 32 bytes (AES-256). Separate from `KYC_ENCRYPTION_KEY`. Rotating it invalidates stored IG tokens (creators must reconnect). |
| `CRON_SECRET` | **secret** | `instaauto/drain`, `instaauto/maintenance` | Reused (already defined for payout sync). Bearer token for the cron drainer + token-refresh sweep. |
```

- [ ] **Step 2: Add the same vars to `.env.example`**

Append:

```bash
# Instagram Auto DM
INSTAGRAM_APP_ID=
INSTAGRAM_APP_SECRET=
INSTAGRAM_WEBHOOK_VERIFY_TOKEN=
INSTAAUTO_TOKEN_ENCRYPTION_KEY=
```

- [ ] **Step 3: Generate a local key for dev**

Run: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
Copy the output into `.env.local` as `INSTAAUTO_TOKEN_ENCRYPTION_KEY=...` (not committed). Set a `INSTAGRAM_WEBHOOK_VERIFY_TOKEN` to any random string in `.env.local` too.

- [ ] **Step 4: Commit**

```bash
git add .claude/rules/env-vars.md .env.example
git commit -m "docs(instaauto): declare Instagram Auto DM env vars"
```

---

## Milestone 1 — Database migration + types

### Task 1.1: Write and apply the migration

**Files:**
- Create: `supabase/migrations/20260713140000_instaauto_phase1.sql`

- [ ] **Step 1: Write the full migration file**

```sql
-- Instagram Auto DM (Phase 1). Comment-to-DM automation with follow-gating.
-- 8 tables + 3 atomic RPCs. All instaauto_. No money tables touched.
-- Reads: profiles(id) as creator_id. RLS helpers: current_profile_id(), is_super_admin().

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
-- No client SELECT: token never leaves the server. Reads go via /api/instaauto/account (service role).
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
-- Ownership is derived through the parent automation.
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
```

- [ ] **Step 2: Verify `citext` is available**

The Supabase MCP tool: `list_extensions`. If `citext` is not enabled, prepend `create extension if not exists citext;` to the migration.

- [ ] **Step 3: Apply via Supabase MCP**

Use `apply_migration` with name `instaauto_phase1` and the SQL above. Confirm success (no error).

- [ ] **Step 4: Sanity-check with the MCP**

`list_tables` (schema `public`) → confirm the 8 `instaauto_*` tables exist. `get_advisors` (type `security`) → confirm no "RLS disabled" advisory for any `instaauto_*` table.

- [ ] **Step 5: Commit the migration file**

```bash
git add supabase/migrations/20260713140000_instaauto_phase1.sql
git commit -m "feat(instaauto): migration — 8 tables + 3 RPCs + RLS"
```

### Task 1.2: Regenerate types

**Files:**
- Modify: `types/database.types.ts`

- [ ] **Step 1: Regenerate**

Run: `npm run update-types`
If it fails on Windows, use the MCP `generate_typescript_types` and overwrite `types/database.types.ts` with the result.

- [ ] **Step 2: Verify the new tables typed**

Run: `npx tsc --noEmit`
Expected: clean. Confirm `Database['public']['Tables']['instaauto_accounts']` resolves (grep the file for `instaauto_accounts`).

- [ ] **Step 3: Commit**

```bash
git add types/database.types.ts
git commit -m "chore(instaauto): regenerate Supabase types"
```

---

## Milestone 2 — Pure-logic libraries (TDD)

> These modules are the risky logic. Each is a colocated vitest unit. Run `npx vitest run <file>` per task.

### Task 2.1: Constants + shared types

**Files:**
- Create: `src/lib/server/instaauto/constants.ts`
- Create: `src/lib/server/instaauto/types.ts`

- [ ] **Step 1: Write `constants.ts`**

```typescript
// Instagram Auto DM — tunables. Server-only.
export const MAX_ATTEMPTS = 5;
export const FAST_PATH_BATCH = 5;   // messages the after() fast-path drains inline
export const CRON_DRAIN_BATCH = 20; // messages the cron drains per account per run
export const SEND_SPACING_MS = 500; // ~2 sends/sec/account (Meta cap)
export const IG_API_VERSION = 'v21.0';
export const DM_WINDOW_HOURS = 24;
export const COMMENT_MAX_AGE_DAYS = 7;
export const PHASE1_TRIGGERS = ['comment', 'dm_keyword', 'story_reply', 'story_mention'] as const;
export const REQUIRED_SCOPES = [
  'instagram_business_basic',
  'instagram_business_manage_messages',
  'instagram_business_manage_comments',
];
```

- [ ] **Step 2: Write `types.ts`**

```typescript
// Instagram Auto DM — shared server types.
export type InboundEventType = 'comment' | 'dm' | 'story_reply' | 'story_mention' | 'postback';

export interface InboundEvent {
  eventType: InboundEventType;
  igUserId: string;            // sender IGSID
  igUsername?: string;
  text: string;                // comment text / message text (empty for postback)
  commentId?: string;          // for comment events (private-reply target)
  mediaId?: string;            // media the comment is on (media-scope match)
  payloadRef?: string;         // postback payload string
  commentCreatedAt?: string;   // ISO — for the 7-day comment-age guard
  raw: unknown;                // original envelope slice (stored in events.payload)
}

export interface ResolvedPayload {
  messageText: string;         // {name}-substituted
  link?: string;
  buttons?: Array<{ title: string; payload: string }>;
  notFollowerMessage?: string;
  commentReply?: string;
}

export interface SendResult { igMessageId: string | null; }

export class SendError extends Error {
  httpStatus: number;
  code: string;
  retryable: boolean;
  isOAuthInvalid: boolean;
  constructor(o: { message: string; httpStatus: number; code: string; retryable: boolean; isOAuthInvalid?: boolean }) {
    super(o.message);
    this.httpStatus = o.httpStatus; this.code = o.code;
    this.retryable = o.retryable; this.isOAuthInvalid = o.isOAuthInvalid ?? false;
  }
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/lib/server/instaauto/constants.ts src/lib/server/instaauto/types.ts
git commit -m "feat(instaauto): constants + shared types"
```

### Task 2.2: Token crypto

**Files:**
- Create: `src/lib/server/instaauto/token-crypto.ts`
- Test: `src/lib/server/instaauto/token-crypto.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import crypto from 'crypto';
import { encryptToken, decryptToken, isEncryptedToken } from './token-crypto';

beforeAll(() => {
  process.env.INSTAAUTO_TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');
});

describe('instaauto token-crypto', () => {
  it('round-trips a token', () => {
    const enc = encryptToken('IGQVJ-long-lived-token');
    expect(enc.startsWith('igenc:v1:')).toBe(true);
    expect(decryptToken(enc)).toBe('IGQVJ-long-lived-token');
  });
  it('returns empty string for empty input', () => {
    expect(encryptToken('')).toBe('');
    expect(decryptToken('')).toBe('');
  });
  it('detects the encrypted prefix', () => {
    expect(isEncryptedToken(encryptToken('x'))).toBe(true);
    expect(isEncryptedToken('plaintext')).toBe(false);
  });
  it('throws on tampered ciphertext', () => {
    const enc = encryptToken('secret');
    const tampered = enc.slice(0, -2) + (enc.endsWith('A') ? 'B' : 'A');
    expect(() => decryptToken(tampered)).toThrow();
  });
});
```

- [ ] **Step 2: Run — verify it fails**

Run: `npx vitest run src/lib/server/instaauto/token-crypto.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write `token-crypto.ts`** (clone of `kyc-crypto.ts`, own key + prefix)

```typescript
// Server-only. AES-256-GCM for the Instagram long-lived token before it lands in
// instaauto_accounts.access_token_enc. Key from INSTAAUTO_TOKEN_ENCRYPTION_KEY (base64 32 bytes).
import crypto from 'crypto';

const PREFIX = 'igenc:v1:';
const IV_BYTES = 12;

function getKey(): Buffer {
  const raw = process.env.INSTAAUTO_TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error('INSTAAUTO_TOKEN_ENCRYPTION_KEY is not set.');
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new Error('INSTAAUTO_TOKEN_ENCRYPTION_KEY must decode to 32 bytes (AES-256).');
  return key;
}

export function encryptToken(plaintext: string): string {
  const value = plaintext?.trim();
  if (!value) return '';
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const ct = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + [iv.toString('base64'), tag.toString('base64'), ct.toString('base64')].join(':');
}

export function decryptToken(encoded: string): string {
  if (!encoded) return '';
  if (!isEncryptedToken(encoded)) throw new Error('decryptToken: not igenc:v1 format.');
  const [ivB64, tagB64, ctB64] = encoded.slice(PREFIX.length).split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(ctB64, 'base64')), decipher.final()]).toString('utf8');
}

export function isEncryptedToken(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(PREFIX);
}
```

- [ ] **Step 4: Run — verify it passes**

Run: `npx vitest run src/lib/server/instaauto/token-crypto.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/instaauto/token-crypto.ts src/lib/server/instaauto/token-crypto.test.ts
git commit -m "feat(instaauto): AES-256-GCM token encryption"
```

### Task 2.3: Keyword matching

**Files:**
- Create: `src/lib/server/instaauto/keyword-match.ts`
- Test: `src/lib/server/instaauto/keyword-match.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { matchKeyword } from './keyword-match';

const kw = (word: string, is_negative = false) => ({ word, is_negative });

describe('matchKeyword', () => {
  it('exact: matches a whole-word keyword case-insensitively', () => {
    const r = matchKeyword('Please send me the GUIDE', [kw('guide')], 'exact');
    expect(r.matched).toBe(true);
    expect(r.keyword).toBe('guide');
  });
  it('exact: does not match a substring inside another word', () => {
    expect(matchKeyword('guidebook', [kw('guide')], 'exact').matched).toBe(false);
  });
  it('fuzzy: matches a substring', () => {
    expect(matchKeyword('guidebook', [kw('guide')], 'fuzzy').matched).toBe(true);
  });
  it('negative keyword vetoes an otherwise-matching text', () => {
    const r = matchKeyword('send guide refund', [kw('guide'), kw('refund', true)], 'exact');
    expect(r.matched).toBe(false);
    expect(r.vetoed).toBe(true);
  });
  it('no positive keyword → no match', () => {
    expect(matchKeyword('hello', [kw('refund', true)], 'exact').matched).toBe(false);
  });
  it('ai_intent/sentiment fall back to exact in Phase 1', () => {
    expect(matchKeyword('the guide', [kw('guide')], 'ai_intent').matched).toBe(true);
  });
});
```

- [ ] **Step 2: Run — verify it fails**

Run: `npx vitest run src/lib/server/instaauto/keyword-match.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write `keyword-match.ts`**

```typescript
// Keyword engine. exact = whole-word (word-boundary) match; fuzzy = substring.
// Negative keywords veto the whole automation. ai_intent/sentiment are Phase 2 —
// they fall back to exact so reserved automations still behave predictably.
export interface KeywordRow { word: string; is_negative: boolean }
export interface MatchResult { matched: boolean; keyword?: string; vetoed?: boolean }

function norm(s: string): string { return s.toLowerCase().trim(); }

function hitsExact(text: string, word: string): boolean {
  const w = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^\\p{L}\\p{N}])${w}([^\\p{L}\\p{N}]|$)`, 'iu').test(text);
}
function hitsFuzzy(text: string, word: string): boolean {
  return text.includes(word);
}

export function matchKeyword(
  rawText: string,
  keywords: KeywordRow[],
  matchMode: string,
): MatchResult {
  const text = norm(rawText);
  const fuzzy = matchMode === 'fuzzy';
  const hit = (word: string) => (fuzzy ? hitsFuzzy(text, norm(word)) : hitsExact(text, norm(word)));

  for (const k of keywords) {
    if (k.is_negative && hit(k.word)) return { matched: false, vetoed: true };
  }
  for (const k of keywords) {
    if (!k.is_negative && hit(k.word)) return { matched: true, keyword: k.word };
  }
  return { matched: false };
}
```

- [ ] **Step 4: Run — verify it passes**

Run: `npx vitest run src/lib/server/instaauto/keyword-match.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/instaauto/keyword-match.ts src/lib/server/instaauto/keyword-match.test.ts
git commit -m "feat(instaauto): keyword matching engine"
```

### Task 2.4: Payload resolution

**Files:**
- Create: `src/lib/server/instaauto/payload.ts`
- Test: `src/lib/server/instaauto/payload.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { resolvePayload } from './payload';

describe('resolvePayload', () => {
  it('substitutes {name} and carries link + not-follower message', () => {
    const r = resolvePayload(
      { message: 'Hi {name}! Here: {link}', link: 'https://x.io', not_follower_message: 'Follow first {name}' },
      { name: 'Sam' },
    );
    expect(r.messageText).toBe('Hi Sam! Here: https://x.io');
    expect(r.link).toBe('https://x.io');
    expect(r.notFollowerMessage).toBe('Follow first Sam');
  });
  it('falls back to "there" when name is missing', () => {
    const r = resolvePayload({ message: 'Hi {name}!' }, {});
    expect(r.messageText).toBe('Hi there!');
  });
  it('tolerates an empty payload', () => {
    expect(resolvePayload({}, { name: 'Sam' }).messageText).toBe('');
  });
});
```

- [ ] **Step 2: Run — verify it fails**

Run: `npx vitest run src/lib/server/instaauto/payload.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write `payload.ts`**

```typescript
// Resolve an automation's dm_payload jsonb into the frozen payload_snapshot stored
// on the message. Substitutes {name} (and {link}) at enqueue time so later automation
// edits never change an in-flight send.
import type { ResolvedPayload } from './types';

export interface DmPayload {
  message?: string;
  link?: string;
  not_follower_message?: string;
  comment_reply?: string;
  buttons?: Array<{ title: string; payload: string }>;
}

function subst(t: string, vars: Record<string, string>): string {
  return t
    .replace(/\{name\}/g, vars.name?.trim() || 'there')
    .replace(/\{link\}/g, vars.link ?? '');
}

export function resolvePayload(payload: DmPayload, vars: { name?: string }): ResolvedPayload {
  const v = { name: vars.name ?? '', link: payload.link ?? '' };
  return {
    messageText: payload.message ? subst(payload.message, v) : '',
    link: payload.link,
    buttons: payload.buttons,
    notFollowerMessage: payload.not_follower_message ? subst(payload.not_follower_message, v) : undefined,
    commentReply: payload.comment_reply ? subst(payload.comment_reply, v) : undefined,
  };
}
```

- [ ] **Step 4: Run — verify it passes**

Run: `npx vitest run src/lib/server/instaauto/payload.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/instaauto/payload.ts src/lib/server/instaauto/payload.test.ts
git commit -m "feat(instaauto): payload resolution + {name} substitution"
```

### Task 2.5: Dedup keys

**Files:**
- Create: `src/lib/server/instaauto/dedup.ts`
- Test: `src/lib/server/instaauto/dedup.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { eventDedupKey } from './dedup';

describe('eventDedupKey', () => {
  it('is stable for the same comment', () => {
    const a = eventDedupKey({ accountId: 'acc', eventType: 'comment', externalId: 'c1' });
    const b = eventDedupKey({ accountId: 'acc', eventType: 'comment', externalId: 'c1' });
    expect(a).toBe(b);
  });
  it('differs across accounts, types, ids', () => {
    const base = { accountId: 'acc', eventType: 'comment' as const, externalId: 'c1' };
    expect(eventDedupKey(base)).not.toBe(eventDedupKey({ ...base, accountId: 'acc2' }));
    expect(eventDedupKey(base)).not.toBe(eventDedupKey({ ...base, externalId: 'c2' }));
  });
  it('returns null when there is no external id (cannot dedup)', () => {
    expect(eventDedupKey({ accountId: 'acc', eventType: 'dm', externalId: undefined })).toBeNull();
  });
});
```

- [ ] **Step 2: Run — verify it fails**

Run: `npx vitest run src/lib/server/instaauto/dedup.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write `dedup.ts`**

```typescript
// Stable dedup key for inbound events → instaauto_events.dedup_key (partial UNIQUE).
// A redelivered webhook for the same comment/message/postback is a no-op. When there's
// no stable external id, returns null (row still inserts, just not deduped).
import type { InboundEventType } from './types';

export function eventDedupKey(o: {
  accountId: string;
  eventType: InboundEventType;
  externalId: string | undefined;
}): string | null {
  if (!o.externalId) return null;
  return `${o.accountId}:${o.eventType}:${o.externalId}`;
}
```

- [ ] **Step 4: Run — verify it passes**

Run: `npx vitest run src/lib/server/instaauto/dedup.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/instaauto/dedup.ts src/lib/server/instaauto/dedup.test.ts
git commit -m "feat(instaauto): event dedup keys"
```

### Task 2.6: Backoff + error classification

**Files:**
- Create: `src/lib/server/instaauto/backoff.ts`
- Test: `src/lib/server/instaauto/backoff.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { computeBackoffSeconds, classifyHttpError } from './backoff';

describe('computeBackoffSeconds', () => {
  it('grows exponentially and caps at 1h', () => {
    expect(computeBackoffSeconds(1)).toBeGreaterThanOrEqual(48);   // ~60 ±20%
    expect(computeBackoffSeconds(1)).toBeLessThanOrEqual(72);
    expect(computeBackoffSeconds(10)).toBeLessThanOrEqual(3600);   // capped
  });
});

describe('classifyHttpError', () => {
  it('429 and 5xx are retryable', () => {
    expect(classifyHttpError(429, undefined).retryable).toBe(true);
    expect(classifyHttpError(503, undefined).retryable).toBe(true);
  });
  it('OAuth code 190 is terminal + flags revoke', () => {
    const c = classifyHttpError(400, 190);
    expect(c.retryable).toBe(false);
    expect(c.isOAuthInvalid).toBe(true);
  });
  it('generic 4xx is terminal, not a revoke', () => {
    const c = classifyHttpError(400, 100);
    expect(c.retryable).toBe(false);
    expect(c.isOAuthInvalid).toBe(false);
  });
  it('Meta transient code 2 is retryable', () => {
    expect(classifyHttpError(400, 2).retryable).toBe(true);
  });
});
```

- [ ] **Step 2: Run — verify it fails**

Run: `npx vitest run src/lib/server/instaauto/backoff.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write `backoff.ts`**

```typescript
// Retry policy. Exponential backoff with ±20% jitter, capped at 1h. Error classification
// decides retryable vs terminal and whether the account token is invalid (→ revoke).
const TRANSIENT_META_CODES = new Set([1, 2, 4, 17, 32, 341, 613]); // rate/temporary
const OAUTH_META_CODES = new Set([190, 102, 10, 200]);             // token/permission

export function computeBackoffSeconds(attempt: number): number {
  const base = Math.min(60 * 2 ** (attempt - 1), 3600);
  const jitter = base * (Math.random() * 0.4 - 0.2); // ±20%
  return Math.max(1, Math.round(base + jitter));
}

export interface ErrorClass { retryable: boolean; isOAuthInvalid: boolean }

export function classifyHttpError(httpStatus: number, metaCode: number | undefined): ErrorClass {
  if (metaCode != null && OAUTH_META_CODES.has(metaCode)) {
    return { retryable: false, isOAuthInvalid: metaCode === 190 || metaCode === 102 };
  }
  if (metaCode != null && TRANSIENT_META_CODES.has(metaCode)) return { retryable: true, isOAuthInvalid: false };
  if (httpStatus === 429 || httpStatus >= 500) return { retryable: true, isOAuthInvalid: false };
  return { retryable: false, isOAuthInvalid: false };
}
```

- [ ] **Step 4: Run — verify it passes**

Run: `npx vitest run src/lib/server/instaauto/backoff.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/instaauto/backoff.ts src/lib/server/instaauto/backoff.test.ts
git commit -m "feat(instaauto): retry backoff + error classification"
```

### Task 2.7: Webhook signature verification

**Files:**
- Create: `src/lib/server/instaauto/webhook-verify.ts`
- Test: `src/lib/server/instaauto/webhook-verify.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { verifyMetaSignature } from './webhook-verify';

const secret = 'app-secret';
const body = JSON.stringify({ hello: 'world' });
const sig = 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');

describe('verifyMetaSignature', () => {
  it('accepts a correct signature', () => {
    expect(verifyMetaSignature(body, sig, secret)).toBe(true);
  });
  it('rejects a wrong signature', () => {
    expect(verifyMetaSignature(body, 'sha256=deadbeef', secret)).toBe(false);
  });
  it('rejects a missing header', () => {
    expect(verifyMetaSignature(body, null, secret)).toBe(false);
  });
  it('rejects when the body is altered', () => {
    expect(verifyMetaSignature(body + ' ', sig, secret)).toBe(false);
  });
});
```

- [ ] **Step 2: Run — verify it fails**

Run: `npx vitest run src/lib/server/instaauto/webhook-verify.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write `webhook-verify.ts`**

```typescript
// Meta webhook X-Hub-Signature-256 verification. HMAC-SHA256 over the RAW body,
// hex-encoded, prefixed 'sha256=', compared in constant time. Mirrors the Cashfree
// webhook discipline (timingSafeEqual).
import crypto from 'crypto';

export function verifyMetaSignature(rawBody: string, header: string | null, appSecret: string): boolean {
  if (!header || !appSecret) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex');
  const a = Buffer.from(header, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
```

- [ ] **Step 4: Run — verify it passes**

Run: `npx vitest run src/lib/server/instaauto/webhook-verify.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/instaauto/webhook-verify.ts src/lib/server/instaauto/webhook-verify.test.ts
git commit -m "feat(instaauto): Meta webhook signature verification"
```

### Task 2.8: Webhook envelope parsing

**Files:**
- Create: `src/lib/server/instaauto/event-parse.ts`
- Test: `src/lib/server/instaauto/event-parse.test.ts`

> The Meta Instagram webhook envelope shape must be confirmed against current docs (Step 0). The parser is written defensively so unknown shapes yield `[]` rather than throwing.

- [ ] **Step 0: Confirm the envelope shape**

Use the context7 MCP (`resolve-library-id` → `query-docs`) or `WebFetch` on Meta's "Instagram Platform — Webhooks" reference for the `comments`, `messages`, and `messaging_postbacks` field payloads. Adjust the field paths in Step 3 to match. Record the doc URL in a code comment.

- [ ] **Step 1: Write the failing test** (based on the documented v21 shapes)

```typescript
import { describe, it, expect } from 'vitest';
import { parseWebhookEnvelope } from './event-parse';

describe('parseWebhookEnvelope', () => {
  it('parses a comment event', () => {
    const env = { object: 'instagram', entry: [{ id: 'IG_ACC', time: 1, changes: [
      { field: 'comments', value: { id: 'c1', text: 'send guide', from: { id: 'u1', username: 'sam' }, media: { id: 'm1' } } },
    ] }] };
    const [e] = parseWebhookEnvelope(env);
    expect(e.eventType).toBe('comment');
    expect(e.commentId).toBe('c1');
    expect(e.igUserId).toBe('u1');
    expect(e.text).toBe('send guide');
    expect(e.mediaId).toBe('m1');
  });
  it('parses a DM message event', () => {
    const env = { object: 'instagram', entry: [{ id: 'IG_ACC', time: 1, messaging: [
      { sender: { id: 'u1' }, recipient: { id: 'IG_ACC' }, message: { mid: 'mid1', text: 'guide please' } },
    ] }] };
    const [e] = parseWebhookEnvelope(env);
    expect(e.eventType).toBe('dm');
    expect(e.text).toBe('guide please');
    expect(e.igUserId).toBe('u1');
  });
  it('parses a postback button tap', () => {
    const env = { object: 'instagram', entry: [{ id: 'IG_ACC', time: 1, messaging: [
      { sender: { id: 'u1' }, recipient: { id: 'IG_ACC' }, postback: { mid: 'mid2', payload: 'FOLLOW_OK:auto1' } },
    ] }] };
    const [e] = parseWebhookEnvelope(env);
    expect(e.eventType).toBe('postback');
    expect(e.payloadRef).toBe('FOLLOW_OK:auto1');
  });
  it('classifies a story reply', () => {
    const env = { object: 'instagram', entry: [{ id: 'IG_ACC', time: 1, messaging: [
      { sender: { id: 'u1' }, recipient: { id: 'IG_ACC' }, message: { mid: 'm', text: 'nice', reply_to: { story: { id: 's1' } } } },
    ] }] };
    expect(parseWebhookEnvelope(env)[0].eventType).toBe('story_reply');
  });
  it('returns [] for an unknown envelope', () => {
    expect(parseWebhookEnvelope({ object: 'page', entry: [] })).toEqual([]);
    expect(parseWebhookEnvelope(null)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run — verify it fails**

Run: `npx vitest run src/lib/server/instaauto/event-parse.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write `event-parse.ts`**

```typescript
// Normalize the Meta Instagram webhook envelope into InboundEvent[]. Defensive:
// unknown shapes yield []. Each entry.id is the receiving IG account (ig_user_id).
// Docs: https://developers.facebook.com/docs/instagram-platform/webhooks (confirm fields).
import type { InboundEvent, InboundEventType } from './types';

function str(v: unknown): string { return typeof v === 'string' ? v : ''; }

export function parseWebhookEnvelope(env: unknown): (InboundEvent & { accountIgId: string })[] {
  const out: (InboundEvent & { accountIgId: string })[] = [];
  const e = env as { object?: string; entry?: unknown[] } | null;
  if (!e || e.object !== 'instagram' || !Array.isArray(e.entry)) return out;

  for (const entryRaw of e.entry) {
    const entry = entryRaw as { id?: string; changes?: unknown[]; messaging?: unknown[] };
    const accountIgId = str(entry.id);

    // Comment / live-comment changes.
    for (const chRaw of entry.changes ?? []) {
      const ch = chRaw as { field?: string; value?: Record<string, unknown> };
      if (ch.field === 'comments' && ch.value) {
        const v = ch.value;
        const from = v.from as { id?: string; username?: string } | undefined;
        const media = v.media as { id?: string } | undefined;
        out.push({
          accountIgId, eventType: 'comment', igUserId: str(from?.id), igUsername: from?.username,
          text: str(v.text), commentId: str(v.id) || undefined, mediaId: media?.id,
          commentCreatedAt: v.timestamp ? String(v.timestamp) : undefined, raw: ch,
        });
      }
    }

    // Messaging: DM / story reply / story mention / postback.
    for (const mRaw of entry.messaging ?? []) {
      const m = mRaw as {
        sender?: { id?: string }; message?: Record<string, unknown>; postback?: Record<string, unknown>;
      };
      const senderId = str(m.sender?.id);
      if (m.postback) {
        out.push({ accountIgId, eventType: 'postback', igUserId: senderId, text: '',
          payloadRef: str(m.postback.payload) || undefined, raw: m });
      } else if (m.message) {
        const replyTo = m.message.reply_to as { story?: unknown } | undefined;
        const attachments = m.message.attachments as Array<{ type?: string }> | undefined;
        let type: InboundEventType = 'dm';
        if (replyTo?.story) type = 'story_reply';
        else if (attachments?.some(a => a.type === 'story_mention')) type = 'story_mention';
        out.push({ accountIgId, eventType: type, igUserId: senderId, text: str(m.message.text), raw: m });
      }
    }
  }
  return out;
}
```

- [ ] **Step 4: Run — verify it passes**

Run: `npx vitest run src/lib/server/instaauto/event-parse.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/instaauto/event-parse.ts src/lib/server/instaauto/event-parse.test.ts
git commit -m "feat(instaauto): parse Meta webhook envelope"
```

---

## Milestone 3 — Graph client, send provider & drainer

### Task 3.1: Graph API client

**Files:**
- Create: `src/lib/server/instaauto/graph.ts`

> External API — confirm exact endpoints/version against current Meta docs (Step 1) before wiring. Written as thin `fetch` wrappers that throw `SendError` with the parsed Meta error code.

- [ ] **Step 1: Confirm endpoints**

Via context7 MCP or `WebFetch` on Meta "Instagram Platform" API reference, confirm: OAuth authorize URL + `oauth/access_token` exchange, `graph.instagram.com/access_token` (ig_exchange_token) + `refresh_access_token`, `{ig-user-id}/subscribed_apps`, `{igsid}?fields=name,username,is_user_follow_business`, `{ig-user-id}/messages` (recipient by `comment_id` for private reply, by `id` for DM), `{comment-id}/replies`. Note the doc URLs in comments.

- [ ] **Step 2: Write `graph.ts`**

```typescript
// Meta Instagram Graph API — thin fetch wrappers. Server-only. All calls throw SendError
// on non-2xx with the parsed Meta error code so backoff.classifyHttpError can decide retry.
// Docs: https://developers.facebook.com/docs/instagram-platform (confirm version/paths).
import { IG_API_VERSION } from './constants';
import { SendError } from './types';

const GRAPH = `https://graph.instagram.com/${IG_API_VERSION}`;

async function call(url: string, init: RequestInit): Promise<Record<string, unknown>> {
  const res = await fetch(url, init);
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err = (json.error ?? {}) as { message?: string; code?: number };
    throw new SendError({
      message: err.message ?? `Graph ${res.status}`,
      httpStatus: res.status, code: String(err.code ?? res.status),
      retryable: false, // caller re-classifies via backoff.classifyHttpError(res.status, err.code)
    });
  }
  return json;
}

export async function exchangeCodeForShortToken(code: string, redirectUri: string): Promise<{ token: string; userId: string }> {
  const body = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID!, client_secret: process.env.INSTAGRAM_APP_SECRET!,
    grant_type: 'authorization_code', redirect_uri: redirectUri, code,
  });
  const json = await call('https://api.instagram.com/oauth/access_token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body,
  });
  return { token: String(json.access_token), userId: String(json.user_id) };
}

export async function exchangeForLongLivedToken(shortToken: string): Promise<{ token: string; expiresIn: number }> {
  const u = new URL(`${GRAPH}/access_token`);
  u.searchParams.set('grant_type', 'ig_exchange_token');
  u.searchParams.set('client_secret', process.env.INSTAGRAM_APP_SECRET!);
  u.searchParams.set('access_token', shortToken);
  const json = await call(u.toString(), { method: 'GET' });
  return { token: String(json.access_token), expiresIn: Number(json.expires_in ?? 5184000) };
}

export async function refreshLongLivedToken(token: string): Promise<{ token: string; expiresIn: number }> {
  const u = new URL(`${GRAPH}/refresh_access_token`);
  u.searchParams.set('grant_type', 'ig_refresh_token');
  u.searchParams.set('access_token', token);
  const json = await call(u.toString(), { method: 'GET' });
  return { token: String(json.access_token), expiresIn: Number(json.expires_in ?? 5184000) };
}

export async function getUserProfile(igUserId: string, igsid: string, token: string): Promise<{ username?: string; name?: string; isFollower: boolean }> {
  const u = new URL(`${GRAPH}/${igsid}`);
  u.searchParams.set('fields', 'name,username,is_user_follow_business');
  u.searchParams.set('access_token', token);
  const json = await call(u.toString(), { method: 'GET' });
  return { username: json.username as string | undefined, name: json.name as string | undefined, isFollower: json.is_user_follow_business === true };
}

export async function sendPrivateReply(igUserId: string, commentId: string, text: string, token: string): Promise<string | null> {
  const json = await call(`${GRAPH}/${igUserId}/messages`, {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ recipient: { comment_id: commentId }, message: { text } }),
  });
  return (json.message_id as string) ?? null;
}

export async function sendDirectMessage(igUserId: string, recipientId: string, text: string, buttons: Array<{ title: string; payload: string }> | undefined, token: string): Promise<string | null> {
  const message = buttons?.length
    ? { attachment: { type: 'template', payload: { template_type: 'button', text, buttons: buttons.map(b => ({ type: 'postback', title: b.title, payload: b.payload })) } } }
    : { text };
  const json = await call(`${GRAPH}/${igUserId}/messages`, {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ recipient: { id: recipientId }, message }),
  });
  return (json.message_id as string) ?? null;
}

export async function replyToComment(commentId: string, text: string, token: string): Promise<void> {
  await call(`${GRAPH}/${commentId}/replies`, {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ message: text }),
  });
}

export async function subscribeWebhooks(igUserId: string, token: string): Promise<void> {
  const u = new URL(`${GRAPH}/${igUserId}/subscribed_apps`);
  u.searchParams.set('subscribed_fields', 'comments,messages,message_postbacks');
  u.searchParams.set('access_token', token);
  await call(u.toString(), { method: 'POST' });
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/lib/server/instaauto/graph.ts
git commit -m "feat(instaauto): Meta Graph API client"
```

### Task 3.2: Send layer (window check + provider switch)

**Files:**
- Create: `src/lib/server/instaauto/send.ts`
- Test: `src/lib/server/instaauto/send.test.ts`

- [ ] **Step 1: Write the failing test** (simulated provider + window guard — no network)

```typescript
import { describe, it, expect } from 'vitest';
import { checkSendWindow, isSimulatedSend } from './send';

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

describe('checkSendWindow', () => {
  it('allows a DM within 24h of the last user message', () => {
    expect(checkSendWindow('dm', { last_user_message_at: hoursAgo(1) }).ok).toBe(true);
  });
  it('blocks a DM past the 24h window', () => {
    const r = checkSendWindow('dm', { last_user_message_at: hoursAgo(30) });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('window_closed');
  });
  it('always allows a private_reply (governed by the 7-day comment window, checked upstream)', () => {
    expect(checkSendWindow('private_reply', { last_user_message_at: null }).ok).toBe(true);
  });
});

describe('isSimulatedSend', () => {
  it('is true for a simulated account', () => {
    expect(isSimulatedSend({ is_simulated: true })).toBe(true);
    expect(isSimulatedSend({ is_simulated: false })).toBe(false);
  });
});
```

- [ ] **Step 2: Run — verify it fails**

Run: `npx vitest run src/lib/server/instaauto/send.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write `send.ts`**

```typescript
// Send one queued message. Provider switch: simulated accounts never hit Meta; real
// accounts decrypt the token and call graph.ts. Enforces the 24h DM window before sending.
// Returns { igMessageId } or throws SendError (caller runs backoff.classifyHttpError).
import type { Database } from '@/types/database.types';
import { DM_WINDOW_HOURS } from './constants';
import { SendError, type SendResult } from './types';
import { decryptToken } from './token-crypto';
import * as graph from './graph';

type MessageRow = Database['public']['Tables']['instaauto_messages']['Row'];
type AccountRow = Database['public']['Tables']['instaauto_accounts']['Row'];
type LeadRow = Database['public']['Tables']['instaauto_leads']['Row'];

export function isSimulatedSend(account: Pick<AccountRow, 'is_simulated'>): boolean {
  return account.is_simulated === true;
}

export function checkSendWindow(
  messageType: string,
  lead: Pick<LeadRow, 'last_user_message_at'> | null,
): { ok: boolean; reason?: string } {
  if (messageType !== 'dm') return { ok: true }; // replies use the comment window (upstream)
  const last = lead?.last_user_message_at ? new Date(lead.last_user_message_at).getTime() : 0;
  if (Date.now() - last > DM_WINDOW_HOURS * 3600_000) return { ok: false, reason: 'window_closed' };
  return { ok: true };
}

export async function sendOneMessage(
  account: AccountRow, message: MessageRow, lead: LeadRow | null,
): Promise<SendResult> {
  const win = checkSendWindow(message.message_type, lead);
  if (!win.ok) throw new SendError({ message: win.reason!, httpStatus: 400, code: win.reason!, retryable: false });

  if (isSimulatedSend(account)) {
    return { igMessageId: `sim_${message.id}` };
  }

  const token = decryptToken(account.access_token_enc ?? '');
  const snap = (message.payload_snapshot ?? {}) as { link?: string; buttons?: Array<{ title: string; payload: string }> };
  const text = message.message_text ?? '';
  try {
    if (message.message_type === 'private_reply' && message.ig_comment_id) {
      return { igMessageId: await graph.sendPrivateReply(account.ig_user_id!, message.ig_comment_id, text, token) };
    }
    if (message.message_type === 'comment_reply' && message.ig_comment_id) {
      await graph.replyToComment(message.ig_comment_id, text, token);
      return { igMessageId: null };
    }
    return { igMessageId: await graph.sendDirectMessage(account.ig_user_id!, message.recipient_ig_user_id!, text, snap.buttons, token) };
  } catch (e) {
    if (e instanceof SendError && message.message_type === 'private_reply' && /already/i.test(e.message)) {
      // One-reply-per-comment already satisfied → treat as delivered (idempotent).
      return { igMessageId: null };
    }
    throw e;
  }
}
```

- [ ] **Step 4: Run — verify it passes**

Run: `npx vitest run src/lib/server/instaauto/send.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/instaauto/send.ts src/lib/server/instaauto/send.test.ts
git commit -m "feat(instaauto): send layer — window check + provider switch"
```

### Task 3.3: Drainer

**Files:**
- Create: `src/lib/server/instaauto/drain.ts`

- [ ] **Step 1: Write `drain.ts`**

```typescript
// Shared drainer for both the after() fast-path and the cron. Claims queued messages
// (FOR UPDATE SKIP LOCKED via RPC), sends them paced, and settles through the atomic
// finalize/fail RPCs. Returns counts for observability.
import type { createServiceClient } from '@/lib/supabase/service';
import type { Database } from '@/types/database.types';
import { MAX_ATTEMPTS, SEND_SPACING_MS } from './constants';
import { SendError } from './types';
import { computeBackoffSeconds, classifyHttpError } from './backoff';
import { sendOneMessage } from './send';

type Db = ReturnType<typeof createServiceClient>;
type AccountRow = Database['public']['Tables']['instaauto_accounts']['Row'];
type MessageRow = Database['public']['Tables']['instaauto_messages']['Row'];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function drainAccount(db: Db, account: AccountRow, limit: number): Promise<{ sent: number; failed: number }> {
  const { data: claimed, error } = await db.rpc('instaauto_claim_messages', { p_account_id: account.id, p_limit: limit });
  if (error || !claimed?.length) return { sent: 0, failed: 0 };

  let sent = 0, failed = 0;
  for (let i = 0; i < claimed.length; i++) {
    const msg = claimed[i] as MessageRow;
    const { data: lead } = await db.from('instaauto_leads')
      .select('*').eq('creator_id', msg.creator_id).eq('ig_user_id', msg.recipient_ig_user_id ?? '').maybeSingle();
    try {
      const provider = account.is_simulated ? 'simulated' : 'real';
      const result = await sendOneMessage(account, msg, lead ?? null);
      await db.rpc('instaauto_finalize_send', {
        p_message_id: msg.id, p_ig_message_id: result.igMessageId, p_provider: provider,
        p_is_follower: lead?.is_follower ?? null, p_follow_checked_at: lead?.follow_checked_at ?? null,
      });
      sent++;
    } catch (e) {
      const se = e instanceof SendError ? e : new SendError({ message: String(e), httpStatus: 500, code: 'unknown', retryable: true });
      const cls = classifyHttpError(se.httpStatus, Number(se.code) || undefined);
      const terminal = !cls.retryable || msg.attempts >= MAX_ATTEMPTS;
      await db.rpc('instaauto_fail_send', {
        p_message_id: msg.id, p_outcome: terminal ? 'terminal_error' : 'retryable_error',
        p_error_code: se.code, p_error_message: se.message, p_http_status: se.httpStatus,
        p_terminal: terminal, p_backoff_seconds: computeBackoffSeconds(msg.attempts),
        p_revoke_account: cls.isOAuthInvalid,
      });
      failed++;
    }
    if (i < claimed.length - 1) await sleep(SEND_SPACING_MS);
  }
  return { sent, failed };
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/instaauto/drain.ts
git commit -m "feat(instaauto): hybrid drainer (claim → send → finalize/fail)"
```

### Task 3.4: Inbound pipeline

**Files:**
- Create: `src/lib/server/instaauto/pipeline.ts`

- [ ] **Step 1: Write `pipeline.ts`**

```typescript
// Shared inbound processing, called by BOTH the real webhook and the simulate route.
// Resolves the account → active automations → keyword match → inserts an event → upserts
// the lead → follow-gates → enqueues instaauto_messages (frozen payload_snapshot).
// Then eagerly drains the account (fast path). Never throws to the caller.
import type { createServiceClient } from '@/lib/supabase/service';
import type { Database } from '@/types/database.types';
import type { InboundEvent } from './types';
import { COMMENT_MAX_AGE_DAYS, FAST_PATH_BATCH } from './constants';
import { matchKeyword } from './keyword-match';
import { resolvePayload, type DmPayload } from './payload';
import { eventDedupKey } from './dedup';
import { drainAccount } from './drain';

type Db = ReturnType<typeof createServiceClient>;
type AccountRow = Database['public']['Tables']['instaauto_accounts']['Row'];
type AutomationRow = Database['public']['Tables']['instaauto_automations']['Row'];

const TRIGGER_FOR: Record<string, string> = {
  comment: 'comment', dm: 'dm_keyword', story_reply: 'story_reply', story_mention: 'story_mention',
};

function commentTooOld(iso?: string): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) && Date.now() - t > COMMENT_MAX_AGE_DAYS * 86400_000;
}

export async function processInboundEvent(db: Db, account: AccountRow, ev: InboundEvent): Promise<void> {
  // Postbacks (follow-gate button) are handled separately.
  if (ev.eventType === 'postback') return processPostback(db, account, ev);
  if (ev.eventType === 'comment' && commentTooOld(ev.commentCreatedAt)) return;

  const { data: automations } = await db.from('instaauto_automations')
    .select('*, instaauto_keywords(word, is_negative), instaauto_media_targets(ig_media_id)')
    .eq('account_id', account.id).eq('status', 'active').is('deleted_at', null);
  if (!automations?.length) return;

  const wantTrigger = TRIGGER_FOR[ev.eventType];

  for (const autoRaw of automations) {
    const auto = autoRaw as AutomationRow & {
      instaauto_keywords: { word: string; is_negative: boolean }[];
      instaauto_media_targets: { ig_media_id: string }[];
    };
    if (!(auto.trigger_types ?? []).includes(wantTrigger)) continue;
    if (ev.eventType === 'comment' && auto.media_scope === 'specific') {
      if (!auto.instaauto_media_targets.some((m) => m.ig_media_id === ev.mediaId)) continue;
    }
    const match = matchKeyword(ev.text, auto.instaauto_keywords ?? [], auto.match_mode);
    if (!match.matched) continue;

    await fireAutomation(db, account, auto, ev, match.keyword ?? null);
    break; // first matching automation wins
  }
}

async function fireAutomation(
  db: Db, account: AccountRow, auto: AutomationRow, ev: InboundEvent, keyword: string | null,
): Promise<void> {
  const dedup = eventDedupKey({ accountId: account.id, eventType: ev.eventType, externalId: ev.commentId ?? undefined });
  const { data: event, error: evErr } = await db.from('instaauto_events').insert({
    creator_id: account.creator_id, account_id: account.id, automation_id: auto.id,
    event_type: ev.eventType, ig_user_id: ev.igUserId, ig_username: ev.igUsername ?? null,
    matched_keyword: keyword, dedup_key: dedup, payload: ev.raw as object,
  }).select('id').single();
  if (evErr || !event) return; // dedup unique violation ⇒ already processed

  await db.from('instaauto_leads').upsert({
    creator_id: account.creator_id, account_id: account.id, ig_user_id: ev.igUserId,
    ig_username: ev.igUsername ?? null, first_source: ev.eventType, first_automation_id: auto.id,
    last_user_message_at: new Date().toISOString(),
  }, { onConflict: 'creator_id,ig_user_id', ignoreDuplicates: false });

  const resolved = resolvePayload(auto.dm_payload as DmPayload, { name: ev.igUsername });
  const isComment = ev.eventType === 'comment';

  // Public comment reply (optional).
  if (isComment && resolved.commentReply && ev.commentId) {
    await enqueue(db, account, auto, event.id, ev, 'comment_reply', resolved.commentReply, ev.commentId);
  }

  // Follow-gate.
  if (auto.require_follow) {
    const notFollower = resolved.notFollowerMessage || 'Follow first, then tap ✅ to get the link.';
    const buttons = [{ title: '✅ I followed', payload: `FOLLOW_OK:${auto.id}` }];
    await enqueue(db, account, auto, event.id, ev, isComment ? 'private_reply' : 'dm', notFollower, ev.commentId, { buttons });
    return; // link is delivered on the postback re-check
  }

  // Ungated: deliver the link now.
  await enqueue(db, account, auto, event.id, ev, isComment ? 'private_reply' : 'dm', resolved.messageText, ev.commentId, { link: resolved.link });
}

async function enqueue(
  db: Db, account: AccountRow, auto: AutomationRow, eventId: string, ev: InboundEvent,
  messageType: 'dm' | 'private_reply' | 'comment_reply', text: string, commentId?: string,
  extra?: { link?: string; buttons?: Array<{ title: string; payload: string }> },
): Promise<void> {
  await db.from('instaauto_messages').insert({
    creator_id: account.creator_id, automation_id: auto.id, account_id: account.id, event_id: eventId,
    recipient_ig_user_id: ev.igUserId, recipient_username: ev.igUsername ?? null,
    message_type: messageType, message_text: text,
    payload_snapshot: { text, link: extra?.link ?? null, buttons: extra?.buttons ?? null },
    ig_comment_id: messageType === 'dm' ? null : commentId ?? null,
  }); // UNIQUE(event_id, message_type) makes redelivery a no-op
}

async function processPostback(db: Db, account: AccountRow, ev: InboundEvent): Promise<void> {
  const [tag, automationId] = (ev.payloadRef ?? '').split(':');
  if (tag !== 'FOLLOW_OK' || !automationId) return;

  const { data: auto } = await db.from('instaauto_automations').select('*').eq('id', automationId).maybeSingle();
  if (!auto) return;

  // Live follow re-check.
  let isFollower = false;
  if (!account.is_simulated) {
    try {
      const { getUserProfile } = await import('./graph');
      const { decryptToken } = await import('./token-crypto');
      const prof = await getUserProfile(account.ig_user_id!, ev.igUserId, decryptToken(account.access_token_enc ?? ''));
      isFollower = prof.isFollower;
    } catch { isFollower = false; }
  } else {
    isFollower = true; // demo: postback implies "followed"
  }

  await db.from('instaauto_leads').update({
    is_follower: isFollower, follow_checked_at: new Date().toISOString(), last_user_message_at: new Date().toISOString(),
  }).eq('creator_id', account.creator_id).eq('ig_user_id', ev.igUserId);

  if (!isFollower) return; // still not following → no delivery

  const { data: event } = await db.from('instaauto_events').insert({
    creator_id: account.creator_id, account_id: account.id, automation_id: auto.id,
    event_type: 'postback', ig_user_id: ev.igUserId, ig_username: ev.igUsername ?? null,
    dedup_key: eventDedupKey({ accountId: account.id, eventType: 'postback', externalId: ev.payloadRef }),
    payload: ev.raw as object,
  }).select('id').single();
  if (!event) return;

  const resolved = resolvePayload((auto as AutomationRow).dm_payload as DmPayload, { name: ev.igUsername });
  await enqueue(db, account, auto as AutomationRow, event.id, ev, 'dm', resolved.messageText, undefined, { link: resolved.link });
}

export async function drainFastPath(db: Db, account: AccountRow): Promise<void> {
  try { await drainAccount(db, account, FAST_PATH_BATCH); } catch { /* cron will retry */ }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/instaauto/pipeline.ts
git commit -m "feat(instaauto): inbound pipeline (match → gate → enqueue)"
```

---

## Milestone 4 — Connect & account routes

### Task 4.1: Account status route

**Files:**
- Create: `app/api/instaauto/account/route.ts`

- [ ] **Step 1: Write the route** (token-free — the client never sees `access_token_enc`)

```typescript
// GET /api/instaauto/account — token-free connection status for the dashboard hook.
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveProfileId } from '@/lib/server/resolve-profile';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const creatorId = await resolveProfileId(user.id, user.email);
  if (!creatorId) return NextResponse.json({ error: 'No creator profile' }, { status: 404 });

  const db = createServiceClient();
  const { data } = await db.from('instaauto_accounts')
    .select('id, username, status, is_simulated, avatar_url, connected_at, token_expires_at')
    .eq('creator_id', creatorId).order('connected_at', { ascending: false }).maybeSingle();

  return NextResponse.json({
    account: data ?? null,
    connectConfigured: !!process.env.INSTAGRAM_APP_ID,
  });
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add app/api/instaauto/account/route.ts
git commit -m "feat(instaauto): GET account status route"
```

### Task 4.2: Demo + disconnect routes

**Files:**
- Create: `app/api/instaauto/account/demo/route.ts`
- Create: `app/api/instaauto/account/disconnect/route.ts`

- [ ] **Step 1: Write the demo route**

```typescript
// POST /api/instaauto/account/demo — one-click simulated account (no OAuth). Enables the
// full pipeline demo without Meta. One demo account per creator (idempotent).
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveProfileId } from '@/lib/server/resolve-profile';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const creatorId = await resolveProfileId(user.id, user.email);
  if (!creatorId) return NextResponse.json({ error: 'No creator profile' }, { status: 404 });

  const db = createServiceClient();
  const { data: existing } = await db.from('instaauto_accounts')
    .select('id').eq('creator_id', creatorId).eq('is_simulated', true).maybeSingle();
  if (existing) return NextResponse.json({ accountId: existing.id, demo: true });

  const { data, error } = await db.from('instaauto_accounts').insert({
    creator_id: creatorId, is_simulated: true, status: 'active',
    username: 'demo_creator', avatar_url: null,
  }).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ accountId: data.id, demo: true }, { status: 201 });
}
```

- [ ] **Step 2: Write the disconnect route**

```typescript
// POST /api/instaauto/account/disconnect — owner flips their account to revoked and pauses
// its automations. (Real revoke-with-Meta is out of Phase 1 scope; this stops processing.)
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveProfileId } from '@/lib/server/resolve-profile';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const creatorId = await resolveProfileId(user.id, user.email);
  if (!creatorId) return NextResponse.json({ error: 'No creator profile' }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { accountId?: string };
  const db = createServiceClient();
  const q = db.from('instaauto_accounts').update({ status: 'revoked' }).eq('creator_id', creatorId);
  const { error } = body.accountId ? await q.eq('id', body.accountId) : await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await db.from('instaauto_automations').update({ status: 'paused' })
    .eq('creator_id', creatorId).eq('status', 'active');
  return NextResponse.json({ disconnected: true });
}
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add app/api/instaauto/account/demo/route.ts app/api/instaauto/account/disconnect/route.ts
git commit -m "feat(instaauto): demo + disconnect account routes"
```

### Task 4.3: OAuth connect + callback

**Files:**
- Create: `app/api/instaauto/connect/route.ts`
- Create: `app/api/instaauto/callback/route.ts`

- [ ] **Step 1: Write the connect route**

```typescript
// GET /api/instaauto/connect — redirect to Meta OAuth. Disabled when the app isn't
// configured (demo mode still works). State = signed creatorId to bind the callback.
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { resolveProfileId } from '@/lib/server/resolve-profile';
import { REQUIRED_SCOPES } from '@/lib/server/instaauto/constants';

export async function GET() {
  if (!process.env.INSTAGRAM_APP_ID || !process.env.INSTAGRAM_APP_SECRET) {
    return NextResponse.json({ error: 'not_configured' }, { status: 501 });
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const creatorId = await resolveProfileId(user.id, user.email);
  if (!creatorId) return NextResponse.json({ error: 'No creator profile' }, { status: 404 });

  const state = signState(creatorId);
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/instaauto/callback`;
  const url = new URL('https://www.instagram.com/oauth/authorize');
  url.searchParams.set('client_id', process.env.INSTAGRAM_APP_ID);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', REQUIRED_SCOPES.join(','));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('state', state);
  return NextResponse.redirect(url.toString());
}

function signState(creatorId: string): string {
  const mac = crypto.createHmac('sha256', process.env.INSTAGRAM_APP_SECRET!).update(creatorId).digest('hex').slice(0, 16);
  return `${creatorId}.${mac}`;
}
```

- [ ] **Step 2: Write the callback route**

```typescript
// GET /api/instaauto/callback — exchange code → long-lived token → encrypt → upsert
// instaauto_accounts → subscribe webhooks. Verifies the signed state.
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServiceClient } from '@/lib/supabase/service';
import { exchangeCodeForShortToken, exchangeForLongLivedToken, getUserProfile, subscribeWebhooks } from '@/lib/server/instaauto/graph';
import { encryptToken } from '@/lib/server/instaauto/token-crypto';
import { REQUIRED_SCOPES } from '@/lib/server/instaauto/constants';

function verifyState(state: string | null): string | null {
  if (!state) return null;
  const [creatorId, mac] = state.split('.');
  if (!creatorId || !mac) return null;
  const expect = crypto.createHmac('sha256', process.env.INSTAGRAM_APP_SECRET!).update(creatorId).digest('hex').slice(0, 16);
  return mac === expect ? creatorId : null;
}

export async function GET(req: Request) {
  const base = process.env.NEXT_PUBLIC_APP_URL!;
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const creatorId = verifyState(url.searchParams.get('state'));
  if (!code || !creatorId) return NextResponse.redirect(`${base}/dashboard/autodm?connect=error`);

  try {
    const redirectUri = `${base}/api/instaauto/callback`;
    const short = await exchangeCodeForShortToken(code, redirectUri);
    const long = await exchangeForLongLivedToken(short.token);
    const profile = await getUserProfile(short.userId, short.userId, long.token).catch(() => ({ username: undefined, isFollower: false }));

    const db = createServiceClient();
    await db.from('instaauto_accounts').upsert({
      creator_id: creatorId, ig_user_id: short.userId, username: profile.username ?? null,
      access_token_enc: encryptToken(long.token),
      token_expires_at: new Date(Date.now() + long.expiresIn * 1000).toISOString(),
      scopes: REQUIRED_SCOPES, status: 'active', is_simulated: false,
      connected_at: new Date().toISOString(), last_refreshed_at: new Date().toISOString(),
    }, { onConflict: 'ig_user_id' });

    await subscribeWebhooks(short.userId, long.token).catch((e) => console.error('[instaauto/callback] subscribe failed', e));
    return NextResponse.redirect(`${base}/dashboard/autodm?connect=success`);
  } catch (e) {
    console.error('[instaauto/callback]', e);
    return NextResponse.redirect(`${base}/dashboard/autodm?connect=error`);
  }
}
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add app/api/instaauto/connect/route.ts app/api/instaauto/callback/route.ts
git commit -m "feat(instaauto): OAuth connect + callback"
```

---

## Milestone 5 — Webhook + simulate

### Task 5.1: Instagram webhook route

**Files:**
- Create: `app/api/webhook/instagram/route.ts`

- [ ] **Step 1: Write the route**

```typescript
// GET  /api/webhook/instagram — hub.challenge subscription verification.
// POST /api/webhook/instagram — HMAC verify → 200 fast → process via after().
import { NextResponse, after } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyMetaSignature } from '@/lib/server/instaauto/webhook-verify';
import { parseWebhookEnvelope } from '@/lib/server/instaauto/event-parse';
import { processInboundEvent, drainFastPath } from '@/lib/server/instaauto/pipeline';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  if (mode === 'subscribe' && token && token === process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? '', { status: 200 });
  }
  return new NextResponse('forbidden', { status: 403 });
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const ok = verifyMetaSignature(rawBody, req.headers.get('x-hub-signature-256'), process.env.INSTAGRAM_APP_SECRET ?? '');
  if (!ok) return NextResponse.json({ error: 'invalid signature' }, { status: 401 });

  let envelope: unknown = null;
  try { envelope = JSON.parse(rawBody); } catch { return NextResponse.json({ received: true }); }

  after(async () => {
    try {
      const db = createServiceClient();
      const events = parseWebhookEnvelope(envelope);
      const byAccount = new Map<string, string>(); // igAccountId → account.id
      for (const ev of events) {
        let accountId = byAccount.get(ev.accountIgId);
        let account;
        if (!accountId) {
          const { data } = await db.from('instaauto_accounts').select('*')
            .eq('ig_user_id', ev.accountIgId).eq('status', 'active').maybeSingle();
          if (!data) continue;
          account = data; byAccount.set(ev.accountIgId, data.id);
        } else {
          const { data } = await db.from('instaauto_accounts').select('*').eq('id', accountId).maybeSingle();
          account = data;
        }
        if (!account) continue;
        await processInboundEvent(db, account, ev);
        await drainFastPath(db, account);
      }
    } catch (e) {
      console.error('[webhook/instagram] processing failed', e);
    }
  });

  return NextResponse.json({ received: true });
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add app/api/webhook/instagram/route.ts
git commit -m "feat(instaauto): Instagram webhook (verify + fast-200 + after())"
```

### Task 5.2: Simulate route

**Files:**
- Create: `app/api/instaauto/simulate/route.ts`

- [ ] **Step 1: Write the route** (owner-scoped; simulated accounts only)

```typescript
// POST /api/instaauto/simulate — inject a synthetic inbound event into the REAL pipeline.
// Owner-scoped; only allowed for the creator's own simulated account. Powers the demo.
import { NextResponse, after } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveProfileId } from '@/lib/server/resolve-profile';
import { processInboundEvent, drainFastPath } from '@/lib/server/instaauto/pipeline';
import type { InboundEvent, InboundEventType } from '@/lib/server/instaauto/types';

interface Body { eventType?: InboundEventType; text?: string; igUsername?: string; mediaId?: string; payloadRef?: string; }

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const creatorId = await resolveProfileId(user.id, user.email);
  if (!creatorId) return NextResponse.json({ error: 'No creator profile' }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Body;
  const db = createServiceClient();
  const { data: account } = await db.from('instaauto_accounts').select('*')
    .eq('creator_id', creatorId).eq('is_simulated', true).maybeSingle();
  if (!account) return NextResponse.json({ error: 'No demo account' }, { status: 404 });

  const igUserId = `sim_user_${Math.random().toString(36).slice(2, 8)}`;
  const ev: InboundEvent = {
    eventType: body.eventType ?? 'comment', igUserId, igUsername: body.igUsername || 'sim_follower',
    text: body.text ?? '', commentId: body.eventType === 'comment' ? `sim_c_${Date.now()}` : undefined,
    mediaId: body.mediaId, payloadRef: body.payloadRef, raw: { simulated: true, ...body },
  };

  after(async () => {
    try { await processInboundEvent(db, account, ev); await drainFastPath(db, account); }
    catch (e) { console.error('[instaauto/simulate]', e); }
  });
  return NextResponse.json({ accepted: true });
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add app/api/instaauto/simulate/route.ts
git commit -m "feat(instaauto): simulate route (synthetic events → real pipeline)"
```

---

## Milestone 6 — Cron routes

### Task 6.1: Drain cron

**Files:**
- Create: `app/api/instaauto/drain/route.ts`

- [ ] **Step 1: Write the route**

```typescript
// POST /api/instaauto/drain — CRON_SECRET-guarded queue drainer. Drains every account
// with queued, due messages. Pace via CRON_DRAIN_BATCH per account per run.
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { drainAccount } from '@/lib/server/instaauto/drain';
import { CRON_DRAIN_BATCH } from '@/lib/server/instaauto/constants';

function authorized(req: Request): boolean {
  const h = req.headers.get('authorization') ?? '';
  return !!process.env.CRON_SECRET && h === `Bearer ${process.env.CRON_SECRET}`;
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = createServiceClient();

  const { data: due } = await db.from('instaauto_messages')
    .select('account_id').eq('status', 'queued').lte('send_after', new Date().toISOString()).limit(500);
  const accountIds = [...new Set((due ?? []).map((r) => r.account_id))];

  let sent = 0, failed = 0;
  for (const accountId of accountIds) {
    const { data: account } = await db.from('instaauto_accounts').select('*').eq('id', accountId).maybeSingle();
    if (!account || account.status !== 'active') continue;
    const r = await drainAccount(db, account, CRON_DRAIN_BATCH);
    sent += r.sent; failed += r.failed;
  }
  return NextResponse.json({ accounts: accountIds.length, sent, failed });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/instaauto/drain/route.ts
git commit -m "feat(instaauto): drain cron route"
```

### Task 6.2: Maintenance cron (token refresh + stuck sweep)

**Files:**
- Create: `app/api/instaauto/maintenance/route.ts`

- [ ] **Step 1: Write the route**

```typescript
// POST /api/instaauto/maintenance — CRON_SECRET. (1) Refresh long-lived tokens expiring
// within 7 days. (2) Re-queue messages stuck in 'processing' > 15 min (crash recovery).
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { refreshLongLivedToken } from '@/lib/server/instaauto/graph';
import { encryptToken, decryptToken } from '@/lib/server/instaauto/token-crypto';

function authorized(req: Request): boolean {
  const h = req.headers.get('authorization') ?? '';
  return !!process.env.CRON_SECRET && h === `Bearer ${process.env.CRON_SECRET}`;
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = createServiceClient();

  // Stuck sweep — back to queued for the drainer.
  const stuckBefore = new Date(Date.now() - 15 * 60_000).toISOString();
  const { data: stuck } = await db.from('instaauto_messages')
    .update({ status: 'queued' }).eq('status', 'processing').lt('last_attempt_at', stuckBefore).select('id');

  // Token refresh — real accounts expiring within 7 days.
  const soon = new Date(Date.now() + 7 * 86400_000).toISOString();
  const { data: accounts } = await db.from('instaauto_accounts')
    .select('*').eq('is_simulated', false).eq('status', 'active').lt('token_expires_at', soon);
  let refreshed = 0;
  for (const acc of accounts ?? []) {
    try {
      const next = await refreshLongLivedToken(decryptToken(acc.access_token_enc ?? ''));
      await db.from('instaauto_accounts').update({
        access_token_enc: encryptToken(next.token),
        token_expires_at: new Date(Date.now() + next.expiresIn * 1000).toISOString(),
        last_refreshed_at: new Date().toISOString(),
      }).eq('id', acc.id);
      refreshed++;
    } catch (e) {
      console.error('[instaauto/maintenance] refresh failed', acc.id, e);
      await db.from('instaauto_accounts').update({ status: 'expired' }).eq('id', acc.id);
    }
  }
  return NextResponse.json({ requeued: stuck?.length ?? 0, refreshed });
}
```

- [ ] **Step 2: Verify build + commit**

Run: `npx tsc --noEmit` (expected clean), then:

```bash
git add app/api/instaauto/maintenance/route.ts
git commit -m "feat(instaauto): maintenance cron (token refresh + stuck sweep)"
```

---

## Milestone 7 — Dashboard hooks

### Task 7.1: `useInstaAccount`

**Files:**
- Create: `src/hooks/instaauto/useInstaAccount.ts`

- [ ] **Step 1: Write the hook**

```typescript
'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface AccountStatus {
  account: { id: string; username: string | null; status: string; is_simulated: boolean; avatar_url: string | null; connected_at: string; token_expires_at: string | null } | null;
  connectConfigured: boolean;
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? res.statusText);
  return res.json();
}

export function useInstaAccount() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['instaauto', 'account'],
    queryFn: () => getJson<AccountStatus>('/api/instaauto/account'),
  });

  const addDemo = useMutation({
    mutationFn: () => getJson('/api/instaauto/account/demo', { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['instaauto'] }),
  });
  const disconnect = useMutation({
    mutationFn: () => getJson('/api/instaauto/account/disconnect', { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['instaauto'] }),
  });

  return {
    account: query.data?.account ?? null,
    connectConfigured: query.data?.connectConfigured ?? false,
    isLoading: query.isLoading,
    addDemoAccount: addDemo.mutateAsync,
    disconnect: disconnect.mutateAsync,
    isMutating: addDemo.isPending || disconnect.isPending,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/instaauto/useInstaAccount.ts
git commit -m "feat(instaauto): useInstaAccount hook"
```

### Task 7.2: `useInstaAutomations` (RLS CRUD + optimistic-concurrency)

**Files:**
- Create: `src/hooks/instaauto/useInstaAutomations.ts`

- [ ] **Step 1: Write the hook** (mirrors `useCoupons` RLS pattern; keywords saved as child rows)

```typescript
'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { getCreatorProfileId } from '@/lib/getCreatorProfileId';
import type { Database } from '@/types/database.types';

type Automation = Database['public']['Tables']['instaauto_automations']['Row'];
type AutomationInsert = Database['public']['Tables']['instaauto_automations']['Insert'];
type Keyword = { word: string; is_negative: boolean };

export function useInstaAutomations(accountId?: string) {
  const qc = useQueryClient();

  const { data: automations = [], isLoading } = useQuery({
    queryKey: ['instaauto', 'automations', accountId ?? null],
    enabled: !!accountId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('instaauto_automations')
        .select('*, instaauto_keywords(id, word, is_negative), instaauto_media_targets(id, ig_media_id, thumbnail_url)')
        .eq('account_id', accountId!).is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as (Automation & { instaauto_keywords: (Keyword & { id: string })[] })[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: Omit<AutomationInsert, 'creator_id'> & { keywords?: Keyword[] }) => {
      const creatorId = await getCreatorProfileId();
      const { keywords, ...auto } = input;
      const { data, error } = await supabase.from('instaauto_automations')
        .insert({ ...auto, creator_id: creatorId } as AutomationInsert).select().single();
      if (error) throw error;
      if (keywords?.length) {
        const { error: kErr } = await supabase.from('instaauto_keywords')
          .insert(keywords.map((k) => ({ automation_id: data.id, word: k.word, is_negative: k.is_negative })));
        if (kErr) throw kErr;
      }
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['instaauto'] }),
  });

  const update = useMutation({
    // Optimistic concurrency: guard on version; bump on success.
    mutationFn: async (input: { id: string; version: number; patch: Partial<AutomationInsert>; keywords?: Keyword[] }) => {
      const { data, error } = await supabase.from('instaauto_automations')
        .update({ ...input.patch, version: input.version + 1, updated_at: new Date().toISOString() })
        .eq('id', input.id).eq('version', input.version).select().maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('This automation was changed elsewhere — reload and retry.');
      if (input.keywords) {
        await supabase.from('instaauto_keywords').delete().eq('automation_id', input.id);
        if (input.keywords.length) {
          await supabase.from('instaauto_keywords')
            .insert(input.keywords.map((k) => ({ automation_id: input.id, word: k.word, is_negative: k.is_negative })));
        }
      }
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['instaauto'] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('instaauto_automations')
        .update({ deleted_at: new Date().toISOString(), status: 'paused' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['instaauto'] }),
  });

  return {
    automations, isLoading,
    createAutomation: create.mutateAsync,
    updateAutomation: update.mutateAsync,
    deleteAutomation: remove.mutateAsync,
    isMutating: create.isPending || update.isPending || remove.isPending,
  };
}
```

- [ ] **Step 2: Verify build + commit**

Run: `npx tsc --noEmit` (expected clean), then:

```bash
git add src/hooks/instaauto/useInstaAutomations.ts
git commit -m "feat(instaauto): useInstaAutomations (RLS CRUD + optimistic concurrency)"
```

### Task 7.3: Leads, messages, analytics hooks

**Files:**
- Create: `src/hooks/instaauto/useInstaLeads.ts`
- Create: `src/hooks/instaauto/useInstaMessages.ts`
- Create: `src/hooks/instaauto/useInstaAnalytics.ts`

- [ ] **Step 1: Write `useInstaLeads.ts`**

```typescript
'use client';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/types/database.types';

type Lead = Database['public']['Tables']['instaauto_leads']['Row'];

export function useInstaLeads(accountId?: string) {
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['instaauto', 'leads', accountId ?? null],
    enabled: !!accountId,
    queryFn: async () => {
      const { data, error } = await supabase.from('instaauto_leads')
        .select('*').eq('account_id', accountId!).order('created_at', { ascending: false }).limit(500);
      if (error) throw error;
      return data as Lead[];
    },
  });
  return { leads, isLoading };
}
```

- [ ] **Step 2: Write `useInstaMessages.ts`**

```typescript
'use client';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/types/database.types';

type Message = Database['public']['Tables']['instaauto_messages']['Row'];

export function useInstaMessages(accountId?: string) {
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['instaauto', 'messages', accountId ?? null],
    enabled: !!accountId,
    queryFn: async () => {
      const { data, error } = await supabase.from('instaauto_messages')
        .select('*, instaauto_automations(name)').eq('account_id', accountId!)
        .order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      return data as (Message & { instaauto_automations: { name: string } | null })[];
    },
  });
  return { messages, isLoading };
}
```

- [ ] **Step 3: Write `useInstaAnalytics.ts`** (derive counts client-side from the other queries)

```typescript
'use client';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

export function useInstaAnalytics(accountId?: string) {
  return useQuery({
    queryKey: ['instaauto', 'analytics', accountId ?? null],
    enabled: !!accountId,
    queryFn: async () => {
      const [{ count: leads }, { count: sent }, { count: failed }] = await Promise.all([
        supabase.from('instaauto_leads').select('id', { count: 'exact', head: true }).eq('account_id', accountId!),
        supabase.from('instaauto_messages').select('id', { count: 'exact', head: true }).eq('account_id', accountId!).eq('status', 'sent'),
        supabase.from('instaauto_messages').select('id', { count: 'exact', head: true }).eq('account_id', accountId!).eq('status', 'failed'),
      ]);
      return { totalLeads: leads ?? 0, totalSent: sent ?? 0, totalFailed: failed ?? 0 };
    },
  });
}
```

- [ ] **Step 4: Verify build + commit**

Run: `npx tsc --noEmit` (expected clean), then:

```bash
git add src/hooks/instaauto/useInstaLeads.ts src/hooks/instaauto/useInstaMessages.ts src/hooks/instaauto/useInstaAnalytics.ts
git commit -m "feat(instaauto): leads, messages, analytics hooks"
```

---

## Milestone 8 — Dashboard rewire

> The prototype `app/dashboard/autodm/page.tsx` (1,358 lines) holds all 10 views + the `MOCK_*` arrays + the `useTemplate`-in-callback rules-of-hooks violation. Strategy: keep the existing JSX/markup and the sub-sidebar layout; extract the views into `src/components/dashboard/autodm/` files; replace `MOCK_*` with hook data; fix the hooks violation; grey out Phase 2 features. Work view-by-view so each task builds green.

### Task 8.1: Scaffolding — shared context + shell

**Files:**
- Create: `src/components/dashboard/autodm/AutoDmContext.tsx`
- Modify: `app/dashboard/autodm/page.tsx`

- [ ] **Step 1: Read the current prototype end-to-end**

Read `app/dashboard/autodm/page.tsx` fully (all 1,358 lines) and list the 10 view render functions + where `MOCK_AUTOMATIONS`, `MOCK_LEADS`, `MOCK_DMS`, and `useTemplate` (the `:1142` violation) are used. Note the shared `View` state + sub-sidebar so the extraction preserves them.

- [ ] **Step 2: Create the context provider** (resolves the active account, exposes hooks to all views)

```typescript
'use client';
import { createContext, useContext, type ReactNode } from 'react';
import { useInstaAccount } from '@/hooks/instaauto/useInstaAccount';

interface Ctx { accountId?: string; isSimulated: boolean; connected: boolean; connectConfigured: boolean; isLoading: boolean; }
const AutoDmContext = createContext<Ctx>({ isSimulated: false, connected: false, connectConfigured: false, isLoading: true });
export const useAutoDm = () => useContext(AutoDmContext);

export function AutoDmProvider({ children }: { children: ReactNode }) {
  const { account, connectConfigured, isLoading } = useInstaAccount();
  return (
    <AutoDmContext.Provider value={{
      accountId: account?.id, isSimulated: account?.is_simulated ?? false,
      connected: account?.status === 'active', connectConfigured, isLoading,
    }}>
      {children}
    </AutoDmContext.Provider>
  );
}
```

- [ ] **Step 3: Wrap the page** — in `page.tsx`, wrap the top-level render in `<AutoDmProvider>`. Leave views intact for now.

- [ ] **Step 4: Verify build + commit**

Run: `npx tsc --noEmit && npm run lint -- app/dashboard/autodm src/components/dashboard/autodm` (expected: no new errors), then:

```bash
git add src/components/dashboard/autodm/AutoDmContext.tsx app/dashboard/autodm/page.tsx
git commit -m "feat(instaauto): autodm account context provider"
```

### Task 8.2: Settings view — connect / demo / disconnect

**Files:**
- Modify: `app/dashboard/autodm/page.tsx` (settings view render function)

- [ ] **Step 1: Replace the static connect form** with real state from `useInstaAccount`/`useAutoDm`:
  - Not connected + `connectConfigured` → "Connect Instagram" button → `window.location.href = '/api/instaauto/connect'`.
  - Not connected → secondary "Add demo account" button → `addDemoAccount()`.
  - Connected → show `username`, `status`, simulated badge, "Disconnect" → `disconnect()`.
  - `status === 'revoked' | 'expired'` → reconnect banner.
  - Read the `?connect=success|error` query param (via `useSearchParams`) and show a toast/inline message.

- [ ] **Step 2: Verify build + commit**

Run: `npx tsc --noEmit` (expected clean), then:

```bash
git add app/dashboard/autodm/page.tsx
git commit -m "feat(instaauto): settings view wired to connect/demo/disconnect"
```

### Task 8.3: Automations list + overview views

**Files:**
- Modify: `app/dashboard/autodm/page.tsx` (automations list + overview render functions)

- [ ] **Step 1: Replace `MOCK_AUTOMATIONS`** with `useInstaAutomations(accountId)`:
  - List: map real automations; toggle active/paused → `updateAutomation({ id, version, patch: { status } })`; delete → `deleteAutomation(id)`.
  - Overview: replace mock stat tiles with `useInstaAnalytics(accountId)` (`totalLeads`, `totalSent`, `totalFailed`) + `automations.length`.
  - Empty state when `!accountId` → prompt to connect/add demo.

- [ ] **Step 2: Verify build + commit**

Run: `npx tsc --noEmit` (expected clean), then:

```bash
git add app/dashboard/autodm/page.tsx
git commit -m "feat(instaauto): automations list + overview on real data"
```

### Task 8.4: Builder view — create/edit + fix rules-of-hooks

**Files:**
- Modify: `app/dashboard/autodm/page.tsx` (builder render function + the `useTemplate` violation at ~:1082/:1142)

- [ ] **Step 1: Fix the hooks violation** — move `useTemplate` (and any hook) out of the callback/loop to component top level. If it applies a template to builder state, convert it into a plain function `applyTemplate(template)` that calls the existing `setState` setters; call it from the click handler, not as a hook.

- [ ] **Step 2: Wire the builder tabs** (keywords / triggers / listener / message) to local form state, then persist via `createAutomation` / `updateAutomation`:
  - Save maps builder state → `{ name, trigger_types, match_mode, require_follow, media_scope, dm_payload: { message, link, not_follower_message, comment_reply }, keywords }`.
  - **Grey out** Phase 2 controls: `ai_intent`/`sentiment` match modes, `SMARTAI` listener, quick-reply buttons, `live_comment`/`post_like`/`story_poll` triggers — render them `disabled` with a "Coming soon" tag. Only `comment`, `dm_keyword`, `story_reply`, `story_mention` are selectable.
  - On edit, pass the current `version` for optimistic concurrency; surface the "changed elsewhere" error as an inline banner.

- [ ] **Step 3: Verify the violation is gone**

Run: `npm run lint -- app/dashboard/autodm/page.tsx`
Expected: **no** `react-hooks/rules-of-hooks` error (pre-existing `<img>`/unescaped warnings may remain).

- [ ] **Step 4: Verify build + commit**

Run: `npx tsc --noEmit` (expected clean), then:

```bash
git add app/dashboard/autodm/page.tsx
git commit -m "feat(instaauto): builder on real data + fix rules-of-hooks violation"
```

### Task 8.5: Leads + DM inbox + analytics views

**Files:**
- Modify: `app/dashboard/autodm/page.tsx` (leads, dms, analytics render functions)

- [ ] **Step 1: Replace `MOCK_LEADS`** with `useInstaLeads(accountId)` (username, source, follower badge, interaction count, created_at).

- [ ] **Step 2: Replace `MOCK_DMS`** with `useInstaMessages(accountId)` (recipient, message_text, automation name, status badge `queued|processing|sent|failed` + `simulated` tag, created_at). Show `last_error` on failed rows.

- [ ] **Step 3: Wire the analytics view** to `useInstaAnalytics` + per-automation `dm_count`/`comment_count` from `useInstaAutomations`. Keep the existing recharts markup; feed it real series (sent/failed counts).

- [ ] **Step 4: Verify build + commit**

Run: `npx tsc --noEmit` (expected clean), then:

```bash
git add app/dashboard/autodm/page.tsx
git commit -m "feat(instaauto): leads + DM inbox + analytics on real data"
```

### Task 8.6: Simulate control + posts/templates/guide cleanup

**Files:**
- Modify: `app/dashboard/autodm/page.tsx`

- [ ] **Step 1: Add a "Simulate event" control** (visible only when `isSimulated`) — a small form (event type select: comment/dm/story_reply; a text input; optional username) that POSTs to `/api/instaauto/simulate`, then invalidates `['instaauto']` after ~1s so leads/DMs refresh. Place it in the overview or settings view.

- [ ] **Step 2: Posts view** — if not implementing media fetch in Phase 1, render an informational empty state ("Specific-post targeting coming soon; automations run on all posts") and remove the mock posts grid. `media_scope='specific'` selection can stay disabled.

- [ ] **Step 3: Templates view** — render the existing template cards; "Use template" calls `applyTemplate` (from 8.4) then routes to the builder. Remove any remaining `MOCK_*` references (grep the file: `git grep -n "MOCK_" app/dashboard/autodm/page.tsx` must return nothing).

- [ ] **Step 4: Guide view** — static copy; update it to describe the real connect + demo + simulate flow and the Phase-2 "coming soon" items.

- [ ] **Step 5: Verify no mocks remain + build**

Run: `git grep -n "MOCK_" app/dashboard/autodm/` (expected: no output), then `npx tsc --noEmit` (expected clean) and `npm run lint -- app/dashboard/autodm/page.tsx` (expected: no rules-of-hooks error).

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/autodm/page.tsx
git commit -m "feat(instaauto): simulate control + posts/templates/guide cleanup"
```

---

## Milestone 9 — Docs, cleanup & verification

### Task 9.1: Update reference docs (Stop-hook enforced)

**Files:**
- Modify: `.claude/rules/api-routes.md`
- Modify: `docs/reference/dashboard-map.md`
- Modify: `.claude/todo-later/8(half)-2026-06-15-dashboard-health-findings.md`

- [ ] **Step 1: Add the instaauto routes to `api-routes.md`** — add rows to the "At a glance" table and a "## Instagram Auto DM" section documenting each route (auth, body, writes-to), mirroring the existing style. Routes: `GET /api/instaauto/account`, `POST /api/instaauto/account/demo`, `POST /api/instaauto/account/disconnect`, `GET /api/instaauto/connect`, `GET /api/instaauto/callback`, `POST /api/instaauto/simulate`, `POST /api/instaauto/drain`, `POST /api/instaauto/maintenance`, `GET+POST /api/webhook/instagram`.

- [ ] **Step 2: Update `docs/reference/dashboard-map.md`** — change the `/dashboard/autodm` entry from "prototype (mock)" to the real feature: list the hooks domain `src/hooks/instaauto/*`, the view components, and that it reads via RLS + account ops via API routes.

- [ ] **Step 3: Re-tag the todo-later finding** — in `8(half)-...md`, mark item #2 (autodm rules-of-hooks) **FIXED** with the date and this plan reference. If item #3 is now the only open item, note that item #2 is resolved. (If the whole file is resolved, `git mv` it to `8(done)-...` and fix inline references — but item #3 site-edit `any` likely remains, so keep `(half)`.)

- [ ] **Step 4: Commit**

```bash
git add .claude/rules/api-routes.md docs/reference/dashboard-map.md ".claude/todo-later/8(half)-2026-06-15-dashboard-health-findings.md"
git commit -m "docs(instaauto): api-routes + dashboard-map + todo-later re-tag"
```

### Task 9.2: Full verification gauntlet

- [ ] **Step 1: Types + lint + unit tests**

Run: `npx tsc --noEmit` — expected clean.
Run: `npm run lint` — expected: no **new** errors in `app/api/instaauto`, `app/api/webhook/instagram`, `src/lib/server/instaauto`, `src/hooks/instaauto`, `app/dashboard/autodm`; specifically **no** `react-hooks/rules-of-hooks`.
Run: `npm test` — expected: all prior tests + the 7 new instaauto suites pass.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: build succeeds; the new routes appear in the route manifest.

- [ ] **Step 3: Manual end-to-end on the demo path** (`npm run dev`, http://localhost:3000)

1. Go to `/dashboard/autodm` → Settings → **Add demo account**. Confirm the connected (simulated) state renders.
2. Builder → create an automation: trigger `comment`, keyword `guide`, message `Hi {name}! {link}`, link `https://example.com`, `require_follow` OFF, status `active`.
3. Overview/Settings → **Simulate event**: type `comment`, text `please send the guide`. Wait ~2s.
4. Confirm: a lead appears (Leads view), a `sent` (simulated) message appears (DM Inbox), the automation `dm_count` incremented, and overview stats updated.
5. Toggle `require_follow` ON, simulate again with a fresh comment → confirm a "follow first" message enqueues; simulate a `postback` with `payloadRef=FOLLOW_OK:<automationId>` → confirm the link DM is delivered.
6. Verify negative-keyword veto: add negative keyword `refund`, simulate `send guide refund` → no message enqueued.

Record any failures and fix before proceeding (use superpowers:systematic-debugging).

- [ ] **Step 4: Confirm the doc-drift Stop hook passes** — the session's Stop hook (`.claude/hooks/check-doc-drift.mjs`) should not flag drift given Task 9.1. If it does, address the flagged file.

- [ ] **Step 5: Final commit (if any fixes)**

```bash
git add -A
git commit -m "fix(instaauto): verification-gauntlet fixes"
```

---

## Out of scope (do NOT build here)

- Real Meta App Review submission (external; parallel track — Build Order step 1 of the spec).
- Phase 2: live-comment, SMARTAI/AI match modes, quick-reply flows, follow-ups, multilingual, lead export.
- Phase 3: short-link/checkout attribution, email→leads piping.
- `instaauto_daily_stats` rollup, `instaauto_flows`, sharded drain workers.

## Deployment notes (for the user, not tasks)

- Schedule two crons hitting the app with `Authorization: Bearer $CRON_SECRET`: `POST /api/instaauto/drain` every 1 min; `POST /api/instaauto/maintenance` daily.
- Register the webhook callback URL `${NEXT_PUBLIC_APP_URL}/api/webhook/instagram` + `INSTAGRAM_WEBHOOK_VERIFY_TOKEN` in the Meta app dashboard; subscribe fields `comments`, `messages`, `message_postbacks`.
- Set all `INSTAGRAM_*` + `INSTAAUTO_TOKEN_ENCRYPTION_KEY` in the deploy environment before enabling real connect.
```
