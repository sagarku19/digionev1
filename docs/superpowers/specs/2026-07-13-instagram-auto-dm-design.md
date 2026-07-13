---
noteId: "b84d7cd07e7711f1b7ddffeec518d7f9"
tags: []

---

# Instagram Auto DM — Phase 1 Design

- **Date:** 2026-07-13
- **Status:** Approved — ready for implementation plan
- **Branch:** `feat/instagram-auto-dm` (all work here; merged to `main` by the user after testing)
- **Surface:** `/dashboard/autodm` (no money tables touched — INR-free surface)

## Context

`app/dashboard/autodm/page.tsx` is a 1,358-line static prototype (marked `⚠️ PROTOTYPE`, lines 2–7). It renders entirely from `MOCK_AUTOMATIONS` / `MOCK_LEADS` / `MOCK_DMS` — no hooks, no API routes, no tables. It carries a real `react-hooks/rules-of-hooks` violation (`.claude/todo-later/8`, `page.tsx:1142`), harmless only because the page is unreachable data-wise. This design replaces the mock backing with a real, API-backed Instagram automation feature while keeping the existing 10-view layout (which already mirrors ManyChat-style tools — familiar UX, so this is a wiring job, not a redesign).

Feature loop: a user comments a keyword on a post/reel → we post a public reply → we send a private DM with the link, optionally gated on whether they follow the creator. Built on the **Instagram API with Instagram Login** (no linked Facebook Page). All new tables are prefixed `instaauto_`.

### Reusable patterns already in the codebase

- **Token encryption** — `src/lib/server/kyc-crypto.ts` (`enc:v1:<iv>:<tag>:<ct>` AES-256-GCM). Clone it for the IG token, keyed on a separate secret.
- **Webhook discipline** — `app/api/webhook/cashfree/route.ts` (raw-body HMAC + `crypto.timingSafeEqual`).
- **200-fast → post-response work** — `app/api/s/[code]/route.ts` (`after()` writes counters via an RPC after responding).
- **Atomic claim + settle RPCs** — the money path (`credit_creator_balance`, `settle_payout`) shows the "one SQL function, guarded on current status" idempotency pattern reused here for `claim` / `finalize_send` / `fail_send`.
- **Create route + per-creator rate limit + RLS** — `app/api/links/route.ts`.
- **Cron with `CRON_SECRET` bearer** — `app/api/admin/payouts/sync/route.ts`.

## Decisions (locked)

| Decision | Choice |
|---|---|
| Spec scope | **Phase 1 only.** Phase 2/3 documented as Future. |
| Meta App Review lead time | **Simulate mode** — a demo path that runs the full pipeline with zero Meta dependency, so the feature is demoable today and the App Review screencast records against it. |
| Send architecture | **Hybrid** — queue-as-source-of-truth; `after()` eagerly drains within a per-account rate budget, cron guarantees the rest. Concurrency-safe claim via `FOR UPDATE SKIP LOCKED`. |
| Plan gating | **Free for all** in Phase 1. Revisit later. |
| Branch | Feature branch `feat/instagram-auto-dm`; user merges to `main`. |
| Account reads | Token **never** reaches the client — account status served by `GET /api/instaauto/account`, not an RLS client read. |

## Goals (Phase 1)

- Connect an Instagram professional account via OAuth **and** a one-click **demo (simulated)** account.
- Comment-to-DM: keywords, all-posts or specific posts/reels, public comment reply + private-reply DM.
- Follow-gating: per-automation toggle — follower gets the link immediately; non-follower gets a "follow first, then tap ✅" message + button; link delivered only after a **live** follow re-check on the button tap.
- DM-keyword auto-reply; story-reply and story-mention triggers.
- Keyword engine: exact + fuzzy matching, negative keywords.
- Leads CRM: every triggered user captured with source, follower status, interaction count.
- DM log + analytics: sent/failed/simulated messages, per-automation counters, overview stats — all from real rows.
- Seeded templates (lead magnet, giveaway, course launch, FAQ) as rows.
- Fix the `rules-of-hooks` violation as part of the rewrite; re-tag `todo-later/8`.

## Non-goals (Phase 1)

- **Cut entirely** (no supported entry point): `post_like`, `story_poll` triggers.
- **Deferred → Phase 2:** `live_comment` trigger; SMARTAI / `ai_intent` / `sentiment` match modes; quick-reply buttons; multi-step flows; window-compliant follow-ups; multilingual matching; lead export. These render **disabled/greyed** in the builder, not hidden.
- **Deferred → Phase 3:** DM a `linksh_` short link; auto-DM checkout links + DM→order revenue attribution; email→`leads` domain piping. (Touches the money path — separate spec + security review.)
- **Deferred tables (not built):** `instaauto_daily_stats` (rollup — aggregate from events/messages until volume demands it), `instaauto_flows` (multi-step builder).

## Data model — `instaauto_` (8 tables + 3 RPCs)

All tables `ENABLE ROW LEVEL SECURITY` with policies in the **same migration** (per CLAUDE.md). Migration applied via the Supabase MCP (`apply_migration`), then `npm run update-types`, then code.

### `instaauto_accounts` — connected IG account
`id uuid pk` · `creator_id uuid → profiles(id)` · `ig_user_id text UNIQUE` (nullable for demo) · `username text` · `access_token_enc text` (AES-256-GCM, nullable for demo) · `token_expires_at timestamptz` (nullable) · `scopes text[]` · `status text` (`active | expired | revoked`) · `is_simulated bool default false` · `avatar_url text` · `connected_at timestamptz` · `last_refreshed_at timestamptz`

- **`is_simulated = true`** ⇒ demo account: no OAuth, no real token, all sends simulated.
- Token encrypted via `src/lib/server/instaauto/token-crypto.ts` (clone of `kyc-crypto.ts`), keyed on `INSTAAUTO_TOKEN_ENCRYPTION_KEY`.

### `instaauto_automations` — one automation
`id` · `creator_id` · `account_id → instaauto_accounts` · `name` · `status` (`draft | active | paused`) · `trigger_types text[]` (`comment | dm_keyword | story_reply | story_mention`; `live_comment` reserved) · `match_mode` (`exact | fuzzy`; `ai_intent | sentiment` reserved) · `multilingual bool` (reserved) · `response_type` (`message`; `smart_ai` reserved) · `dm_payload jsonb` (`{ message, link, not_follower_message, buttons? }`) · `ai_prompt text` (reserved) · `comment_reply text` · `media_scope` (`all | specific`) · `require_follow bool default false` · `dm_count int default 0` · `comment_count int default 0` · `last_fired_at timestamptz` · `version int default 0` (optimistic concurrency) · `created_at` · `updated_at` · `deleted_at`

### `instaauto_keywords` — trigger + negative keywords
`id` · `automation_id → instaauto_automations` · `word citext` · `is_negative bool default false` — `UNIQUE(automation_id, word)`

### `instaauto_media_targets` — "specific posts" scoping
`id` · `automation_id → instaauto_automations` · `ig_media_id text` · `media_type text` · `thumbnail_url text` · `caption_snippet text`

### `instaauto_events` — raw inbound webhook events
`id` · `creator_id` · `account_id` · `automation_id uuid?` · `event_type` (`comment | dm | story_reply | story_mention | postback`) · `ig_user_id text` · `ig_username text` · `matched_keyword text` · `dedup_key text` · `payload jsonb` · `created_at`

- **`dedup_key`** with a partial unique index (`WHERE dedup_key IS NOT NULL`) — a redelivered webhook or a duplicate comment event is a no-op.

### `instaauto_messages` — outbound send record **and** queue
`id` · `creator_id` · `automation_id` · `account_id` · `event_id → instaauto_events` · `recipient_ig_user_id text` · `recipient_username text` · `message_type` (`dm | private_reply | comment_reply`) · `message_text text` · `payload_snapshot jsonb` · `status` (`queued | processing | sent | failed`) · `simulated bool default false` · `attempts int default 0` · `send_after timestamptz default now()` · `last_attempt_at timestamptz` · `last_error text` · `ig_comment_id text` · `ig_message_id text` · `created_at`

- **This table is the queue.** A row is a self-contained send instruction; the sender reads only the row, never the live automation (see Concurrency).
- **`payload_snapshot`** freezes the fully-resolved outbound content at enqueue time (final `{name}`-substituted text, link, buttons, `message_type`) — so editing/pausing/deleting the automation never changes an in-flight send.
- **`status='sent'` + `simulated=true`** is how a demo send terminates; there is no separate `simulated` status.
- **`ig_comment_id`** enforces "one private reply per comment".
- Enqueue idempotency: `UNIQUE(event_id, message_type)` — a redelivered webhook can't double-enqueue the same reply/DM.

### `instaauto_message_attempts` — append-only retry history
`id` · `message_id → instaauto_messages` · `attempt_no int` · `outcome text` (`success | retryable_error | terminal_error`) · `provider text` (`real | simulated`) · `error_code text` · `error_message text` · `http_status int` · `created_at`

- Separates the mutable send record from its immutable attempt log — the audit trail for "why did this DM never arrive?" without bloating the message row.

### `instaauto_leads` — captured contacts (CRM)
`id` · `creator_id` · `account_id` · `ig_user_id text` · `ig_username text` · `first_source text` · `first_automation_id uuid` · `email text?` · `is_follower bool` · `follow_checked_at timestamptz` · `last_user_message_at timestamptz` · `interaction_count int default 0` · `created_at` — `UNIQUE(creator_id, ig_user_id)`

- **`last_user_message_at`** is the 24-hour-window gate, re-checked server-side before every send.

### RPCs (atomic, status-guarded — the money-path pattern)

- **`instaauto_claim_messages(p_account_id uuid, p_limit int)`** — selects `queued` rows with `send_after <= now()` for the account, `FOR UPDATE SKIP LOCKED`, flips them to `processing`, sets `attempts = attempts + 1`, `last_attempt_at = now()`, and returns them. Two concurrent drainers (fast-path `after()` + cron) never claim the same message.
- **`instaauto_finalize_send(p_message_id, p_ig_message_id, p_provider, p_is_follower, p_follow_checked_at)`** — in **one transaction**: `messages.status='sent'` (+ `ig_message_id`, `simulated`), upsert `instaauto_leads` (`interaction_count++`, `last_user_message_at`, follower flags), bump the automation's `dm_count`/`comment_count` by `message_type`, stamp `last_fired_at`, and insert a `success` `instaauto_message_attempts` row. Guards on `status='processing'` — a duplicate finalize is a no-op. Eliminates the "lead upsert succeeds but counter update fails" split.
- **`instaauto_fail_send(p_message_id, p_outcome, p_error_code, p_error_message, p_http_status, p_backoff_seconds)`** — in one transaction: insert a failure `instaauto_message_attempts` row, then either **requeue** (`status='queued'`, `send_after = now() + backoff`) when `retryable_error` and `attempts < MAX`, or **terminal** (`status='failed'`, `last_error`). On an OAuth-invalid code it also flips `instaauto_accounts.status='revoked'` and terminally fails that account's queued rows.

### RLS

| Tables | Policy |
|---|---|
| `automations`, `keywords`, `media_targets` | Creator full **CRUD** under RLS via `current_profile_id()` (coupons pattern — dashboard writes through the browser client). Super-admin SELECT. |
| `accounts`, `events`, `messages`, `message_attempts`, `leads` | **Service-role writes only** (OAuth callback + webhook + simulate route + drain/finalize RPCs are the only writers). Owner `SELECT` on `events`, `messages`, `message_attempts`, `leads`. |
| `accounts` | **No client SELECT** — the token must never reach the browser. Account status is served by `GET /api/instaauto/account` (safe columns only). |

### Critical indexes

| Index | Serves |
|---|---|
| `instaauto_messages (status, send_after)` | drain scan — the hot path |
| `instaauto_messages (account_id, status)` | per-account rate budget + claim scoping |
| `instaauto_messages UNIQUE (event_id, message_type)` | enqueue idempotency |
| `instaauto_messages (ig_comment_id) WHERE ig_comment_id IS NOT NULL` | one-reply-per-comment lookup |
| `instaauto_messages (creator_id, created_at DESC)` | DM Inbox list |
| `instaauto_events UNIQUE (dedup_key) WHERE dedup_key IS NOT NULL` | inbound webhook dedup |
| `instaauto_events (account_id, created_at DESC)` | event feed |
| `instaauto_leads UNIQUE (creator_id, ig_user_id)` + `(account_id, ig_user_id)` | CRM upsert + lookup |
| `instaauto_automations (account_id, status) WHERE deleted_at IS NULL` | active-automation resolution |
| `instaauto_keywords (automation_id)` + `UNIQUE (automation_id, word)` | keyword match |
| `instaauto_accounts (creator_id)` + `UNIQUE (ig_user_id) WHERE ig_user_id IS NOT NULL` | account lookup |
| `instaauto_message_attempts (message_id, attempt_no)` | retry-history read |

## API routes

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/instaauto/connect` | cookie session | Redirect to Meta OAuth. If `INSTAGRAM_APP_ID` unset → `{ error: 'not_configured' }` (demo still works). |
| GET | `/api/instaauto/callback` | OAuth code | code → short → long-lived token → encrypt → insert `instaauto_accounts` (service role) → subscribe webhooks. |
| POST | `/api/instaauto/account/demo` | cookie session | Create a **simulated** account (no OAuth). |
| POST | `/api/instaauto/account/disconnect` | cookie session | Revoke / flip `status` (owner-scoped). |
| GET | `/api/instaauto/account` | cookie session | Token-free connection status for the hook. |
| GET | `/api/webhook/instagram` | `hub.verify_token` | Echo `hub.challenge` (subscription verification). |
| POST | `/api/webhook/instagram` | `X-Hub-Signature-256` HMAC | Verify raw-body HMAC (`timingSafeEqual`) → **200 fast** → process via `after()`. |
| POST | `/api/instaauto/simulate` | cookie session | Inject a synthetic comment/DM/story event into the real pipeline. Owner-scoped; simulated accounts only. |
| POST | `/api/instaauto/drain` | `CRON_SECRET` bearer | Paced queue drain (claim → send → finalize/fail). |
| POST | `/api/instaauto/maintenance` | `CRON_SECRET` bearer | Refresh expiring long-lived tokens; sweep stuck `processing` rows. |

**Automation / keyword / media-target CRUD needs no routes** — direct browser-client writes under RLS (coupons pattern), through the hooks domain, with optimistic-concurrency on `version`.

## Processing pipeline — `src/lib/server/instaauto/`

Shared module called by **both** the real webhook and the simulate route — identical path, so the demo exercises production code.

```
resolve account (by ig_user_id)  → active automations for account
  → keyword match (skip if any negative keyword hits; exact + fuzzy)
  → insert instaauto_events (dedup_key = event_type + ig comment/message id)
  → require_follow?
        fetch is_user_follow_business
        follower     → enqueue link DM (+ optional public comment_reply)
        non-follower → enqueue not_follower_message + ✅ button
  → messaging_postbacks (button tap): resets 24h window → LIVE follow re-check → enqueue deliver
  → enqueue instaauto_messages (payload_snapshot frozen; UNIQUE(event_id,message_type) dedup)
  → hybrid send: claim → send (real|simulated) → instaauto_finalize_send / instaauto_fail_send
```

### Compliance guards (server-side; never trust the UI)

- **24-hour window** — automated DMs only within 24h of the user's last message. Gate on `instaauto_leads.last_user_message_at`; a postback tap resets it. Window-expired = terminal, never retried.
- **One private reply per comment** — dedup on `instaauto_messages.ig_comment_id` + the enqueue unique constraint.
- **Comment age** — skip comments older than 7 days.
- **Live follow re-check** — always re-fetch `is_user_follow_business` on the postback before delivering; cached `is_follower` is display-only (people follow → grab link → unfollow).
- **Rate limits** — 2 calls/sec/account, ~200 automated DMs/hr — enforced by the send budget + claim limit, not the UI.

A policy violation risks Meta revoking the **single app** for **every** creator, so these guards are existential, not nice-to-haves.

## Hybrid send

**Queue-as-source-of-truth.** Every outbound message is an `instaauto_messages` row; both drainers share one function `drainAccount(accountId, budget)`.

- **Fast path** — in the webhook's `after()`, if the account is under its per-account rate budget (token-bucket over recent sends), call `drainAccount` for a small batch → instant delivery for normal volume.
- **Spillover** — anything over budget stays `queued`; `POST /api/instaauto/drain` (cron) paces it within the rate limit and applies backoff on failure.
- **One send function, one provider switch** keyed on `account.is_simulated`:
  - **real** → Meta Graph `fetch` (plain `fetch`, the Cashfree pattern; no new package) → `instaauto_finalize_send(..., provider='real')`.
  - **simulated** → no-op → `instaauto_finalize_send(..., provider='simulated')` writes `status='sent', simulated=true`.

The fast path is just an eager drain of the same queue the cron guarantees — no divergent code paths.

## Delivery: state machine, retries & idempotency

### Message state machine

```
                        ┌───── retryable_error & attempts < MAX ─────┐
                        │        (send_after = now() + backoff)       │
                        ▼                                             │
  enqueue → [queued] ─ claim ─▶ [processing] ──── success ───▶ [sent]  (simulated=true for demo)
                        ▲                    │
                        └──── requeue ───────┤
                                             └── terminal_error OR attempts = MAX ──▶ [failed]
```

`claim` (atomic, `SKIP LOCKED`) increments `attempts` and stamps `last_attempt_at`. `finalize_send` and `fail_send` both guard on `status='processing'`, so a duplicated drain is a no-op.

### Retry & backoff policy

- **`MAX_ATTEMPTS = 5`.** Backoff = `min(60s · 2^(attempt-1), 1h)` with ±20% jitter → ≈ 1m, 2m, 4m, 8m, 16m. Set via `send_after` on requeue.
- **Retryable** (→ requeue): HTTP `429`, `5xx`, network/timeout, Meta transient error codes (e.g. `2`, `4`, `17`, `341`, `613` rate/temporary).
- **Terminal** (→ `failed`, no retry): 24h window closed, comment > 7 days, recipient blocked/invalid, policy rejection. OAuth-invalid (code `190`) is terminal **and** flips `instaauto_accounts.status='revoked'` + terminally fails that account's queued rows (surface the reconnect banner).
- **`stuck processing` sweep** — `/maintenance` re-queues `processing` rows older than N minutes, but only when the latest `instaauto_message_attempts` row shows no recorded 2xx (see idempotency).

### Transaction boundaries

- **Enqueue** — event insert then message insert(s). A crash between them leaves an orphan event (a harmless log; no message ⇒ no send). No cross-row atomicity needed.
- **`finalize_send`** — message→sent + lead upsert + counter bump + `last_fired_at` + success attempt row, all in **one transaction**. The "lead upsert succeeds but counter update fails" state is impossible.
- **`fail_send`** — attempt row + requeue-or-terminal, one transaction.
- **`claim`** — one transaction, `SKIP LOCKED`.

### Outbound idempotency

- **Internal** — `UNIQUE(event_id, message_type)` (no duplicate enqueue) + the claim's `processing` lock (single drainer) + `finalize/fail` status guards (no double settle).
- **Meta-side** — a **private reply** is naturally idempotent per comment: a second attempt is rejected by Meta ("already replied"), which the sender treats as *already sent* (finalize), not a failure. **Plain DMs** have no provider idempotency key; we transition `processing → sent` only after capturing `ig_message_id`, and log every attempt (before/after the call) in `instaauto_message_attempts`. The residual double-send window — Meta accepted the DM but the process died before `finalize` — is an **accepted at-least-once risk for Phase 1**, minimized by the pre/post attempt logging that the stuck-sweep consults before re-queueing.

## Concurrency

- **Queue claiming** — `instaauto_claim_messages` uses `FOR UPDATE SKIP LOCKED`; the fast-path `after()` drainer and the cron drainer can run simultaneously without double-sending.
- **Automation edits vs in-flight sends** — decoupled by design: a queued message carries `payload_snapshot`, and the sender never reads the live automation. Editing, pausing, or deleting an automation cannot alter or corrupt a send already in the queue.
- **Edit vs edit** — dashboard automation updates use optimistic concurrency on `instaauto_automations.version` (`UPDATE … WHERE id = ? AND version = ?`, bump on success). A stale write returns a conflict the hook surfaces as "reload — this automation changed elsewhere," preventing lost updates across tabs/devices.

## Simulate mode (demo without Meta)

The chosen answer to the App Review lead-time problem.

1. Creator clicks **"Add demo account"** → `POST /api/instaauto/account/demo` → `instaauto_accounts.is_simulated = true`, no OAuth.
2. They build automations exactly as for a real account.
3. A **"Simulate event"** control (→ `POST /api/instaauto/simulate`) fires a synthetic comment / DM / story-reply.
4. It runs the **exact** pipeline; sends terminate as `status='sent', simulated=true` with `provider='simulated'` attempt rows.
5. Leads, DM Inbox, analytics, and per-automation counters all populate from real rows.

Real accounts run the identical code with live Meta calls once App Review approves. When `INSTAGRAM_APP_ID` is unset, real connect is disabled but demo mode is fully functional — so development and the review screencast never block on Meta.

## Dashboard rewire

New hooks domain `src/hooks/instaauto/`:

| Hook | Source | Returns |
|---|---|---|
| `useInstaAccount()` | `GET /api/instaauto/account` | connection status (token-free) + demo/disconnect mutations |
| `useInstaAutomations()` | RLS reads + CRUD | automations list + create/update/delete/toggle (optimistic-concurrency on `version`) |
| `useInstaLeads()` | RLS read | captured leads |
| `useInstaMessages()` | RLS read | DM inbox / send log (+ attempt history) |
| `useInstaAnalytics()` | RLS read / aggregate | overview + per-automation stats |

- Query keys `['instaauto', …]`.
- Rewire all 10 prototype views to real data; drop `post_like`/`story_poll`; grey out Phase 2 triggers/modes; seed templates as rows.
- **Fix the `rules-of-hooks` violation** during the rewrite; re-tag `.claude/todo-later/8` accordingly.
- Update `docs/reference/dashboard-map.md` in the **same change-set** (Stop hook `.claude/hooks/check-doc-drift.mjs` enforces).

## Environment & config

New env vars — update `.claude/rules/env-vars.md` **and** `.env.example` in the same commit:

| Var | Scope | Purpose |
|---|---|---|
| `INSTAGRAM_APP_ID` | server | Meta app ID (OAuth). Unset → real connect disabled, demo still works. |
| `INSTAGRAM_APP_SECRET` | **secret** | OAuth token exchange + webhook HMAC key. |
| `INSTAGRAM_WEBHOOK_VERIFY_TOKEN` | **secret** | GET `hub.verify_token` echo check. |
| `INSTAAUTO_TOKEN_ENCRYPTION_KEY` | **secret** | base64 32 bytes (AES-256), separate from `KYC_ENCRYPTION_KEY`. |
| `CRON_SECRET` | **secret** | Reused for `/drain` + `/maintenance`. |

No new packages — Graph API via plain `fetch`. (Phase 2 SMARTAI would add an LLM SDK/key → needs approval per CLAUDE.md.)

## Scalability

The queue-as-truth + atomic-claim architecture is event-driven and scales horizontally by draining faster (higher cron cadence / larger claim batches / more parallel drainers, all safe under `SKIP LOCKED`). It comfortably covers **100 → 1,000 → 10,000 creators** on queue scaling alone. The first structural redesign isn't expected until sustained volume reaches **hundreds of thousands of messages/hour**, at which point a dedicated broker (or Postgres queue extension) and per-account sharded workers would replace the single drain loop. Not a Phase 1 concern.

## Risks

- **Meta App Review is the longest pole.** Business verification + screencast for `instagram_business_manage_messages`. Kick off in parallel; build against test accounts + demo mode meanwhile. Simulate mode removes the hard dependency on approval for development.
- **Policy compliance is existential** — one app serves every creator; a single violation can revoke it for all. Guards are server-side.
- **Webhook must 200 fast** — matching/sending run in `after()`, never blocking the response (Cashfree always-2xx + idempotency model).
- **Token lifecycle** — ~60-day tokens; `/maintenance` cron refreshes; on revocation flip `status` and surface a reconnect banner (silent failure kills trust).
- **Rate limits need a queue mindset** — a viral reel can generate thousands of comments in minutes; the queue + paced drain + backoff absorbs it.

## Build order

1. **Meta app setup + business verification** — kick off now, parallel to everything.
2. Migration: 8 tables + 3 RPCs (`claim` / `finalize_send` / `fail_send`) + indexes + RLS → `npm run update-types`.
3. `token-crypto.ts` + `/api/instaauto/connect` + `/callback` + demo/disconnect/account routes + settings-view wiring.
4. `src/lib/server/instaauto/` pipeline + `/api/webhook/instagram` (verify → match → follow-gate → enqueue with `payload_snapshot`) + `/api/instaauto/simulate`.
5. Hybrid send layer — `drainAccount` (claim → send → finalize/fail), per-account budget, provider switch, retry/backoff — + `/api/instaauto/drain`.
6. Hooks domain + rewire the 10 views to real data; drop dead triggers; seed templates; fix rules-of-hooks; update `dashboard-map.md`.
7. `/api/instaauto/maintenance` cron (token refresh + stuck-`processing` sweep).
8. Verify end-to-end against demo accounts; then submit Meta App Review with the screencast.

## Future (out of scope here)

- **Phase 2:** live-comment automation, SMARTAI (LLM, gated behind Plus/Pro via subscriptions), quick-reply buttons, multi-step flows, follow-ups, multilingual matching, lead export.
- **Phase 3:** DM `linksh_` short links (built-in click attribution), auto-DM checkout links + DM→order revenue attribution, email→`leads` piping, post-purchase delivery DMs.
- **Deferred infra:** `instaauto_daily_stats` rollup, `instaauto_flows`, per-account sharded drain workers (only at hundreds-of-thousands msg/hr).
