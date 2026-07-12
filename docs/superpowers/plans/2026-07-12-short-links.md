---
noteId: "97575ea07dc911f1b7ddffeec518d7f9"
tags: []

---

# Short Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Phase 1 short-link MVP for DigiOne creators — mint/manage links on a dedicated short domain, redirect with click tracking, and see per-link analytics in the dashboard.

**Architecture:** A thin bare-root redirect (`{shortdomain}/{code}` → `proxy.ts` rewrite → `GET /api/s/[code]` → 302) backed by two tables (`linksh_links`, `linksh_click_events`) and one atomic idempotent RPC (`linksh_record_click`). Pure, unit-tested libs do code-gen / URL-safety / UA-parsing / dedup / caching. Creator CRUD goes through validated `/api/links*` routes; reads go through a browser-client + RLS hook. The dashboard renders the modern-shortener idiom (link cards, live-preview create drawer, dedicated analytics page) on DigiOne CSS-var tokens.

**Tech Stack:** Next.js 16 (App Router, route handlers, `after()`), TypeScript strict, Supabase (Postgres + RLS, service client), Vitest (node env) for pure libs, TanStack Query v5, recharts, qrcode.react (already installed), lucide-react.

**Spec:** `docs/superpowers/specs/2026-07-12-short-links-design.md`

**Branch:** `feat/short-links` (already checked out).

---

## File structure

**Pure libs (unit-tested with Vitest):**
- `src/lib/shared/shortlink.ts` — `getShortlinkDomain()`, `shortUrl(code)` (client + server safe; reads a `NEXT_PUBLIC_` var only).
- `src/lib/server/shortlinks/code.ts` — `generateCode()`, `normalizeCode()`, `isValidCode()`, `RESERVED_CODES`.
- `src/lib/server/shortlinks/url-safety.ts` — `validateDestinationUrl()`.
- `src/lib/server/shortlinks/ua.ts` — `parseUserAgent()`, `isBot()`.
- `src/lib/server/shortlinks/redirect-url.ts` — `appendUtmParams()`.
- `src/lib/server/shortlinks/dedup.ts` — `dedupHash()`, `hashIp()`.
- `src/lib/server/shortlinks/cache.ts` — `TtlCache<T>`.

**Server routes:**
- `app/api/s/[code]/route.ts` — the redirect + tracking.
- `app/api/links/route.ts` — `POST` create.
- `app/api/links/[id]/route.ts` — `PATCH` edit, `DELETE`.
- `app/api/links/check-code/route.ts` — `GET` availability.

**Middleware:** `proxy.ts` — short-domain host branch (modify).

**Data:** `supabase/migrations/<ts>_short_links.sql` + regen `types/database.types.ts`.

**Client:**
- `src/hooks/marketing/useShortLinks.ts` — list + mutations + `useShortLinkAnalytics`.
- `app/dashboard/links/page.tsx` — list page.
- `app/dashboard/links/[id]/page.tsx` — analytics detail page.
- `src/components/dashboard/links/LinkCard.tsx`, `LinkFormDrawer.tsx`, `QRButton.tsx`, `BreakdownList.tsx`, `ClicksChart.tsx`.
- `src/components/dashboard/Sidebar.tsx` — nav entry (modify).

**Docs (same change-set):** `.claude/rules/env-vars.md`, `.env.example`, `.claude/rules/api-routes.md`, `.claude/rules/hooks-reference.md`, `docs/reference/dashboard-map.md`.

**Note on `code` typing:** the spec wrote `code citext`. To avoid depending on the `citext` extension and to match the existing `sites.slug` precedent, we use `code text` stored **lowercased** with a plain `UNIQUE`, and lowercase on every lookup. Same case-insensitive behavior, no extension.

**Phase-1 UI scope notes (intentional deltas from spec §6):** the list page ships **search + status pills** — the dedicated tag-filter dropdown, sort control (Recent / Most clicks), and archived-hide toggle are deferred (search already matches tags; archived links render with an `archived` pill). The analytics page shows **all-time** history — the `DateRangePicker` is deferred. The create drawer's live preview is the short-URL chip + QR (the destination-favicon preview is deferred; the favicon still appears on list cards). These are additive polish, not structural, and don't change any table, route, or hook. Deletion uses a native `confirm()` for MVP rather than `ConfirmDialog`.

---

## Task 1: Database migration + RLS + RPC + regenerated types

**Files:**
- Create: `supabase/migrations/20260712120000_short_links.sql`
- Modify: `types/database.types.ts` (regenerated — never hand-edit)

- [ ] **Step 1: Write the migration SQL file**

Create `supabase/migrations/20260712120000_short_links.sql`:

```sql
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
```

- [ ] **Step 2: Apply the migration via the Supabase MCP**

The Windows Supabase CLI is broken (no `win32-x64` binary), so apply through the MCP. Call:

```
mcp__plugin_supabase_supabase__apply_migration
  project_id: qcendfisvyjnwmefruba
  name: short_links
  query: <the full SQL from Step 1>
```

Expected: success with no error. If `public.is_super_admin()` or `public.current_profile_id()` is reported missing, stop — they should already exist (used across existing policies); do not invent them.

- [ ] **Step 3: Verify the objects exist**

Call:

```
mcp__plugin_supabase_supabase__execute_sql
  project_id: qcendfisvyjnwmefruba
  query: select table_name from information_schema.tables where table_name in ('linksh_links','linksh_click_events'); select proname from pg_proc where proname = 'linksh_record_click';
```

Expected: both tables and the function are listed.

- [ ] **Step 4: Regenerate types (Windows MCP path)**

Per `.claude/rules/supabase-reference.md`, `npm run update-types` fails on Windows. Call:

```
mcp__plugin_supabase_supabase__generate_typescript_types
  project_id: qcendfisvyjnwmefruba
```

The tool output is a JSON envelope saved to a tool-results `.txt`. Strip the envelope and write the TS with Python (the Bash tool prints the tool-results path):

```bash
python3 - <<'PY'
import json
src = r"<path-to-mcp-tool-results-file>.txt"
dst = r"types\database.types.ts"
with open(src, 'r', encoding='utf-8') as f:
    payload = json.load(f)
with open(dst, 'w', encoding='utf-8', newline='\n') as f:
    f.write(payload['types'])
PY
```

- [ ] **Step 5: Verify the new types compile and include the tables**

Run: `npx tsc --noEmit`
Expected: PASS (no errors).

Run (PowerShell): `Select-String -Path types\database.types.ts -Pattern "linksh_links","linksh_record_click"`
Expected: both matched.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260712120000_short_links.sql types/database.types.ts
git commit -m "feat(short-links): tables, RLS, and linksh_record_click RPC"
```

---

## Task 2: Shared short-link domain helper (TDD)

**Files:**
- Create: `src/lib/shared/shortlink.ts`
- Test: `src/lib/shared/shortlink.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/shared/shortlink.test.ts`:

```ts
import { describe, it, expect, afterEach } from 'vitest';
import { getShortlinkDomain, shortUrl } from './shortlink';

const original = process.env.NEXT_PUBLIC_SHORTLINK_DOMAIN;
afterEach(() => { process.env.NEXT_PUBLIC_SHORTLINK_DOMAIN = original; });

describe('shortlink domain helpers', () => {
  it('returns the configured domain', () => {
    process.env.NEXT_PUBLIC_SHORTLINK_DOMAIN = 'linkme.you';
    expect(getShortlinkDomain()).toBe('linkme.you');
  });

  it('builds an https short url for a real domain', () => {
    process.env.NEXT_PUBLIC_SHORTLINK_DOMAIN = 'linkme.you';
    expect(shortUrl('abc123')).toBe('https://linkme.you/abc123');
  });

  it('uses http for localhost', () => {
    process.env.NEXT_PUBLIC_SHORTLINK_DOMAIN = 'localhost:3000';
    expect(shortUrl('abc123')).toBe('http://localhost:3000/abc123');
  });

  it('falls back to empty domain string', () => {
    delete process.env.NEXT_PUBLIC_SHORTLINK_DOMAIN;
    expect(getShortlinkDomain()).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/shared/shortlink.test.ts`
Expected: FAIL ("Cannot find module './shortlink'").

- [ ] **Step 3: Write the implementation**

`src/lib/shared/shortlink.ts`:

```ts
// Short-link domain + URL helpers. Safe on client and server — reads only a
// NEXT_PUBLIC_ env var. Do NOT import server-only modules here.

export function getShortlinkDomain(): string {
  return process.env.NEXT_PUBLIC_SHORTLINK_DOMAIN || '';
}

export function shortUrl(code: string): string {
  const host = getShortlinkDomain() || 'localhost:3000';
  const scheme = host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https';
  return `${scheme}://${host}/${code}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/shared/shortlink.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/shared/shortlink.ts src/lib/shared/shortlink.test.ts
git commit -m "feat(short-links): shared domain + shortUrl helper"
```

---

## Task 3: Code generation, normalization, validation (TDD)

**Files:**
- Create: `src/lib/server/shortlinks/code.ts`
- Test: `src/lib/server/shortlinks/code.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/server/shortlinks/code.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { generateCode, normalizeCode, isValidCode, RESERVED_CODES } from './code';

describe('short-link code', () => {
  it('generates a 7-char code from the safe alphabet', () => {
    const code = generateCode();
    expect(code).toHaveLength(7);
    expect(/^[a-z0-9]+$/.test(code)).toBe(true);
    expect(/[01lio]/.test(code)).toBe(false); // no ambiguous chars
  });

  it('generates a code of a requested length', () => {
    expect(generateCode(10)).toHaveLength(10);
  });

  it('normalizes to trimmed lowercase', () => {
    expect(normalizeCode('  SpringSale ')).toBe('springsale');
  });

  it('accepts valid custom codes', () => {
    expect(isValidCode('spring-sale')).toBe(true);
    expect(isValidCode('AbC123')).toBe(true); // normalized internally
  });

  it('rejects too-short, spaced, dotted, and reserved codes', () => {
    expect(isValidCode('ab')).toBe(false);
    expect(isValidCode('has space')).toBe(false);
    expect(isValidCode('has.dot')).toBe(false);
    expect(isValidCode('report')).toBe(false);
    expect(RESERVED_CODES.has('robots.txt')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/server/shortlinks/code.test.ts`
Expected: FAIL ("Cannot find module './code'").

- [ ] **Step 3: Write the implementation**

`src/lib/server/shortlinks/code.ts`:

```ts
// Pure helpers for short-link codes: generation, normalization, validation.

// base31 — omits ambiguous 0/o/1/l/i so hand-typed codes are unambiguous.
const ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz';

export const RESERVED_CODES = new Set([
  '', 'robots.txt', 'sitemap.xml', 'report', 'favicon.ico', 'api', '_next',
]);

export function generateCode(length = 7): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

export function normalizeCode(input: string): string {
  return (input ?? '').trim().toLowerCase();
}

export function isValidCode(input: string): boolean {
  const code = normalizeCode(input);
  if (RESERVED_CODES.has(code)) return false;
  // 3–50 chars, starts alphanumeric, then alphanumeric / hyphen / underscore
  return /^[a-z0-9][a-z0-9_-]{2,49}$/.test(code);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/server/shortlinks/code.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/shortlinks/code.ts src/lib/server/shortlinks/code.test.ts
git commit -m "feat(short-links): code generation + validation lib"
```

---

## Task 4: Destination URL safety (TDD)

**Files:**
- Create: `src/lib/server/shortlinks/url-safety.ts`
- Test: `src/lib/server/shortlinks/url-safety.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/server/shortlinks/url-safety.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { validateDestinationUrl } from './url-safety';

describe('validateDestinationUrl', () => {
  it('accepts a normal https URL', () => {
    const r = validateDestinationUrl('https://example.com/path?a=1');
    expect(r.ok).toBe(true);
    expect(r.url).toContain('https://example.com/path');
  });

  it('rejects empty input', () => {
    expect(validateDestinationUrl('  ').ok).toBe(false);
  });

  it('rejects javascript: and data: schemes', () => {
    expect(validateDestinationUrl('javascript:alert(1)').ok).toBe(false);
    expect(validateDestinationUrl('data:text/html,<script>').ok).toBe(false);
  });

  it('rejects non-http protocols', () => {
    expect(validateDestinationUrl('ftp://example.com').ok).toBe(false);
  });

  it('rejects a bare host with no scheme', () => {
    expect(validateDestinationUrl('example.com').ok).toBe(false);
  });

  it('rejects a self-loop to the short domain', () => {
    const r = validateDestinationUrl('https://linkme.you/xyz', { shortDomain: 'linkme.you' });
    expect(r.ok).toBe(false);
  });

  it('rejects DigiOne auth/login URLs', () => {
    const r = validateDestinationUrl('https://digione.ai/login?x=1', { appHost: 'digione.ai' });
    expect(r.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/server/shortlinks/url-safety.test.ts`
Expected: FAIL ("Cannot find module './url-safety'").

- [ ] **Step 3: Write the implementation**

`src/lib/server/shortlinks/url-safety.ts`:

```ts
// Validates a creator-supplied destination URL for the public redirector.
// Blocks dangerous schemes, self-loops to the short domain, and DigiOne
// auth/login URLs (anti open-redirect / credential phishing).

const BLOCKED_SCHEMES = ['javascript:', 'data:', 'vbscript:', 'file:'];
const BLOCKED_APP_PATHS = ['/login', '/signup', '/api/auth', '/user-login', '/reset-password'];

export interface UrlSafetyResult {
  ok: boolean;
  url?: string;
  error?: string;
}

export function validateDestinationUrl(
  raw: string,
  opts: { shortDomain?: string; appHost?: string } = {}
): UrlSafetyResult {
  const input = (raw ?? '').trim();
  if (!input) return { ok: false, error: 'Destination URL is required' };

  const lower = input.toLowerCase();
  if (BLOCKED_SCHEMES.some((s) => lower.startsWith(s))) {
    return { ok: false, error: 'That URL scheme is not allowed' };
  }

  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    return { ok: false, error: 'Enter a full URL including https://' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, error: 'Only http and https links are allowed' };
  }

  const host = parsed.host.toLowerCase();

  if (opts.shortDomain && host === opts.shortDomain.toLowerCase()) {
    return { ok: false, error: 'A short link cannot point to the short domain' };
  }

  if (opts.appHost && host === opts.appHost.toLowerCase()) {
    const path = parsed.pathname.toLowerCase();
    if (BLOCKED_APP_PATHS.some((p) => path.startsWith(p))) {
      return { ok: false, error: 'That destination is not allowed' };
    }
  }

  return { ok: true, url: parsed.toString() };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/server/shortlinks/url-safety.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/shortlinks/url-safety.ts src/lib/server/shortlinks/url-safety.test.ts
git commit -m "feat(short-links): destination URL safety lib"
```

---

## Task 5: User-agent parsing + bot detection (TDD)

**Files:**
- Create: `src/lib/server/shortlinks/ua.ts`
- Test: `src/lib/server/shortlinks/ua.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/server/shortlinks/ua.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseUserAgent, isBot } from './ua';

const CHROME_WIN = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const SAFARI_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const EDGE = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36 Edg/120.0';

describe('parseUserAgent', () => {
  it('parses desktop Chrome on Windows', () => {
    expect(parseUserAgent(CHROME_WIN)).toEqual({ deviceType: 'desktop', browser: 'Chrome', os: 'Windows' });
  });

  it('parses mobile Safari on iPhone', () => {
    expect(parseUserAgent(SAFARI_IPHONE)).toEqual({ deviceType: 'mobile', browser: 'Safari', os: 'iOS' });
  });

  it('prefers Edge over Chrome when both tokens present', () => {
    expect(parseUserAgent(EDGE).browser).toBe('Edge');
  });

  it('handles a null UA', () => {
    expect(parseUserAgent(null)).toEqual({ deviceType: 'desktop', browser: 'Other', os: 'Other' });
  });
});

describe('isBot', () => {
  it('flags common crawlers and empty UAs', () => {
    expect(isBot('facebookexternalhit/1.1')).toBe(true);
    expect(isBot('Googlebot/2.1')).toBe(true);
    expect(isBot('')).toBe(true);
    expect(isBot(null)).toBe(true);
  });

  it('passes a real browser UA', () => {
    expect(isBot(CHROME_WIN)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/server/shortlinks/ua.test.ts`
Expected: FAIL ("Cannot find module './ua'").

- [ ] **Step 3: Write the implementation**

`src/lib/server/shortlinks/ua.ts`:

```ts
// Lightweight, dependency-free user-agent parsing for click analytics,
// plus a bot skip heuristic. Good-enough fidelity, not a full UA database.

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export function isBot(ua: string | null | undefined): boolean {
  if (!ua) return true; // no UA → treat as bot/unknown, don't count
  return /bot|crawler|spider|crawling|facebookexternalhit|slurp|bingpreview|whatsapp|telegrambot|preview|monitor|curl|wget|python-requests|headless|lighthouse/i.test(ua);
}

function parseDeviceType(ua: string): DeviceType {
  if (/ipad|tablet|playbook|silk|android(?!.*mobile)/i.test(ua)) return 'tablet';
  if (/mobi|iphone|ipod|android.*mobile|windows phone/i.test(ua)) return 'mobile';
  return 'desktop';
}

function parseBrowser(ua: string): string {
  if (/edg/i.test(ua)) return 'Edge';
  if (/opr|opera/i.test(ua)) return 'Opera';
  if (/samsungbrowser/i.test(ua)) return 'Samsung Internet';
  if (/chrome|crios/i.test(ua)) return 'Chrome';
  if (/firefox|fxios/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua)) return 'Safari';
  return 'Other';
}

function parseOs(ua: string): string {
  if (/windows/i.test(ua)) return 'Windows';
  if (/iphone|ipad|ipod|ios/i.test(ua)) return 'iOS';
  if (/mac os x|macintosh/i.test(ua)) return 'macOS';
  if (/android/i.test(ua)) return 'Android';
  if (/linux/i.test(ua)) return 'Linux';
  return 'Other';
}

export function parseUserAgent(ua: string | null | undefined): {
  deviceType: DeviceType; browser: string; os: string;
} {
  const s = ua ?? '';
  return { deviceType: parseDeviceType(s), browser: parseBrowser(s), os: parseOs(s) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/server/shortlinks/ua.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/shortlinks/ua.ts src/lib/server/shortlinks/ua.test.ts
git commit -m "feat(short-links): user-agent parsing + bot detection lib"
```

---

## Task 6: UTM append + dedup hash (TDD)

**Files:**
- Create: `src/lib/server/shortlinks/redirect-url.ts`
- Create: `src/lib/server/shortlinks/dedup.ts`
- Test: `src/lib/server/shortlinks/redirect-url.test.ts`
- Test: `src/lib/server/shortlinks/dedup.test.ts`

- [ ] **Step 1: Write the failing tests**

`src/lib/server/shortlinks/redirect-url.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { appendUtmParams } from './redirect-url';

describe('appendUtmParams', () => {
  it('appends only the set utm params', () => {
    const out = appendUtmParams('https://example.com/p', {
      utm_source: 'ig', utm_medium: null, utm_campaign: 'spring',
    });
    expect(out).toContain('utm_source=ig');
    expect(out).toContain('utm_campaign=spring');
    expect(out).not.toContain('utm_medium');
  });

  it('does not override params already on the destination', () => {
    const out = appendUtmParams('https://example.com/p?utm_source=existing', { utm_source: 'ig' });
    expect(out).toContain('utm_source=existing');
    expect(out).not.toContain('utm_source=ig');
  });

  it('returns the raw string when destination is not a URL', () => {
    expect(appendUtmParams('not a url', { utm_source: 'ig' })).toBe('not a url');
  });
});
```

`src/lib/server/shortlinks/dedup.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { dedupHash, hashIp } from './dedup';

describe('dedup', () => {
  it('hashes an ip to 16 hex chars', () => {
    const h = hashIp('1.2.3.4');
    expect(h).toHaveLength(16);
    expect(/^[0-9a-f]+$/.test(h)).toBe(true);
  });

  it('is stable within the same 30s bucket', () => {
    const t = 1_000_000_000_000;
    expect(dedupHash('link1', 'ip1', t)).toBe(dedupHash('link1', 'ip1', t + 5_000));
  });

  it('changes across buckets', () => {
    const t = 1_000_000_000_000;
    expect(dedupHash('link1', 'ip1', t)).not.toBe(dedupHash('link1', 'ip1', t + 40_000));
  });

  it('changes for a different link or ip', () => {
    const t = 1_000_000_000_000;
    expect(dedupHash('link1', 'ip1', t)).not.toBe(dedupHash('link2', 'ip1', t));
    expect(dedupHash('link1', 'ip1', t)).not.toBe(dedupHash('link1', 'ip2', t));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/server/shortlinks/redirect-url.test.ts src/lib/server/shortlinks/dedup.test.ts`
Expected: FAIL (modules not found).

- [ ] **Step 3: Write the implementations**

`src/lib/server/shortlinks/redirect-url.ts`:

```ts
// Builds the final redirect URL by appending the link's set UTM params
// to the destination (without clobbering params already present).

export interface UtmParams {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
}

export function appendUtmParams(destination: string, utm: UtmParams): string {
  let url: URL;
  try {
    url = new URL(destination);
  } catch {
    return destination;
  }
  const entries: Array<[string, string | null | undefined]> = [
    ['utm_source', utm.utm_source],
    ['utm_medium', utm.utm_medium],
    ['utm_campaign', utm.utm_campaign],
    ['utm_term', utm.utm_term],
    ['utm_content', utm.utm_content],
  ];
  for (const [key, value] of entries) {
    if (value && !url.searchParams.has(key)) url.searchParams.set(key, value);
  }
  return url.toString();
}
```

`src/lib/server/shortlinks/dedup.ts`:

```ts
import { createHash } from 'crypto';

// 30-second bucket dedup key — the UNIQUE guard that makes click recording
// idempotent (see the linksh_record_click RPC).
export const DEDUP_WINDOW_SECONDS = 30;

export function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex').slice(0, 16);
}

export function dedupHash(linkId: string, ipHash: string, nowMs: number = Date.now()): string {
  const bucket = Math.floor(nowMs / 1000 / DEDUP_WINDOW_SECONDS);
  return createHash('sha256').update(`${linkId}:${ipHash}:${bucket}`).digest('hex');
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/server/shortlinks/redirect-url.test.ts src/lib/server/shortlinks/dedup.test.ts`
Expected: PASS (7 tests total).

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/shortlinks/redirect-url.ts src/lib/server/shortlinks/dedup.ts src/lib/server/shortlinks/redirect-url.test.ts src/lib/server/shortlinks/dedup.test.ts
git commit -m "feat(short-links): UTM append + dedup hash libs"
```

---

## Task 7: In-process TTL cache (TDD)

**Files:**
- Create: `src/lib/server/shortlinks/cache.ts`
- Test: `src/lib/server/shortlinks/cache.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/server/shortlinks/cache.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { TtlCache } from './cache';

describe('TtlCache', () => {
  it('returns a stored value before expiry', () => {
    let now = 0;
    const c = new TtlCache<number>(1000, () => now);
    c.set('a', 42);
    now = 500;
    expect(c.get('a')).toBe(42);
  });

  it('evicts after the TTL', () => {
    let now = 0;
    const c = new TtlCache<number>(1000, () => now);
    c.set('a', 42);
    now = 1000;
    expect(c.get('a')).toBeUndefined();
  });

  it('distinguishes a cached null from a miss', () => {
    let now = 0;
    const c = new TtlCache<number | null>(1000, () => now);
    c.set('a', null);
    expect(c.get('a')).toBeNull();      // cached negative lookup
    expect(c.get('b')).toBeUndefined(); // never set
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/server/shortlinks/cache.test.ts`
Expected: FAIL ("Cannot find module './cache'").

- [ ] **Step 3: Write the implementation**

`src/lib/server/shortlinks/cache.ts`:

```ts
// Short-TTL in-process cache. Per-lambda + ephemeral in serverless — it only
// saves DB reads on hot links; 302s stay no-store. Stores positive AND
// negative (unknown-code) entries. `now` is injectable for tests.

interface CacheEntry<T> { value: T; expiresAt: number; }

export class TtlCache<T> {
  private store = new Map<string, CacheEntry<T>>();
  constructor(private ttlMs: number, private now: () => number = Date.now) {}

  get(key: string): T | undefined {
    const hit = this.store.get(key);
    if (!hit) return undefined;
    if (this.now() >= hit.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return hit.value;
  }

  set(key: string, value: T): void {
    this.store.set(key, { value, expiresAt: this.now() + this.ttlMs });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/server/shortlinks/cache.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Run the full suite to confirm no regressions**

Run: `npm test`
Expected: PASS — all prior suites plus the 6 new short-link suites.

- [ ] **Step 6: Commit**

```bash
git add src/lib/server/shortlinks/cache.ts src/lib/server/shortlinks/cache.test.ts
git commit -m "feat(short-links): in-process TTL resolution cache"
```

---

## Task 8: Redirect route `GET /api/s/[code]`

**Files:**
- Create: `app/api/s/[code]/route.ts`

- [ ] **Step 1: Write the route**

`app/api/s/[code]/route.ts`:

```ts
// GET /api/s/[code] — resolves a short code and 302-redirects to its
// destination. proxy.ts rewrites {shortdomain}/{code} → here. Click tracking
// runs post-response via after() and never blocks the redirect.

import { NextResponse, after } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { normalizeCode } from '@/lib/server/shortlinks/code';
import { appendUtmParams } from '@/lib/server/shortlinks/redirect-url';
import { parseUserAgent, isBot } from '@/lib/server/shortlinks/ua';
import { dedupHash, hashIp } from '@/lib/server/shortlinks/dedup';
import { TtlCache } from '@/lib/server/shortlinks/cache';
import type { Database } from '@/types/database.types';

type LinkRow = Database['public']['Tables']['linksh_links']['Row'];

const resolveCache = new TtlCache<LinkRow | null>(30_000);
const appUrl = () => process.env.NEXT_PUBLIC_APP_URL || 'https://digione.ai';

function redirect(to: string) {
  return NextResponse.redirect(to, { status: 302, headers: { 'Cache-Control': 'no-store' } });
}

async function resolve(code: string): Promise<LinkRow | null> {
  const cached = resolveCache.get(code);
  if (cached !== undefined) return cached;
  const db = createServiceClient();
  const { data } = await db.from('linksh_links').select('*').eq('code', code).maybeSingle();
  const row = (data as LinkRow | null) ?? null;
  resolveCache.set(code, row);
  return row;
}

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await params;
  const code = normalizeCode(rawCode);

  const link = await resolve(code);
  if (!link) return redirect(appUrl());

  const now = Date.now();
  const expired = link.expires_at ? new Date(link.expires_at).getTime() < now : false;
  if (!link.is_active || link.archived_at || expired) {
    return redirect(link.expired_redirect_url || appUrl());
  }

  const finalUrl = appendUtmParams(link.destination_url, link);

  const ua = req.headers.get('user-agent');
  const referrer = req.headers.get('referer') || req.headers.get('referrer') || null;
  const country = req.headers.get('x-vercel-ip-country') || req.headers.get('cf-ipcountry') || null;
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip') || 'unknown';

  after(async () => {
    try {
      if (isBot(ua)) return;
      const ipH = hashIp(ip);
      const { deviceType, browser, os } = parseUserAgent(ua);
      const db = createServiceClient();
      await db.rpc('linksh_record_click', {
        p_link_id: link.id,
        p_creator_id: link.creator_id,
        p_ip_hash: ipH,
        p_country: country,
        p_device_type: deviceType,
        p_browser: browser,
        p_os: os,
        p_referrer_url: referrer,
        p_user_agent: ua,
        p_resolved_destination_url: finalUrl,
        p_dedup_hash: dedupHash(link.id, ipH, now),
      });
    } catch (err) {
      console.error('[api/s] tracking failed', err);
    }
  });

  return redirect(finalUrl);
}
```

> If `after` is unavailable from `next/server` at build time, replace the `after(async () => { … })` wrapper with `await (async () => { … })()` immediately before the final `return redirect(finalUrl)` — the tracking then runs inline (one extra RPC round-trip) but still never throws out of the try/catch.

- [ ] **Step 2: Verify it type-checks and lints**

Run: `npx tsc --noEmit`
Expected: PASS.

Run: `npm run lint`
Expected: PASS (no errors on the new file).

- [ ] **Step 3: Manual smoke (optional, needs a row + env)**

With `NEXT_PUBLIC_SHORTLINK_DOMAIN` set and one `linksh_links` row (`code='test'`, active), run `npm run dev` and open `http://localhost:3000/api/s/test`.
Expected: 302 to the destination; a `linksh_click_events` row appears; `click_count` increments.

- [ ] **Step 4: Commit**

```bash
git add app/api/s/[code]/route.ts
git commit -m "feat(short-links): redirect route with cached resolve + tracking"
```

---

## Task 9: `proxy.ts` short-domain branch

**Files:**
- Modify: `proxy.ts`

- [ ] **Step 1: Add the short-domain branch**

In `proxy.ts`, add a module-scope constant after the existing imports (top of file, below the `GUARDED_PREFIXES` line):

```ts
const SHORTLINK_DOMAIN = (process.env.NEXT_PUBLIC_SHORTLINK_DOMAIN || '')
  .toLowerCase()
  .split(':')[0];
const SHORTLINK_RESERVED = new Set(['robots.txt', 'sitemap.xml', 'report', 'favicon.ico']);
```

Then, inside `proxy()`, insert this block **immediately after** `const hostname = request.headers.get('host') || '';` and **before** the `// 1. Custom-domain rewrite` block:

```ts
  // 0. Dedicated short-link domain — bare-root {shortdomain}/{code}
  const bareHost = hostname.toLowerCase().split(':')[0];
  if (SHORTLINK_DOMAIN && bareHost === SHORTLINK_DOMAIN) {
    if (url.pathname === '/') {
      return NextResponse.redirect(process.env.NEXT_PUBLIC_APP_URL || 'https://digione.ai');
    }
    const code = url.pathname.slice(1);
    if (SHORTLINK_RESERVED.has(code) || code.includes('/')) {
      return NextResponse.next();
    }
    url.pathname = `/api/s/${code}`;
    return NextResponse.rewrite(url);
  }
```

- [ ] **Step 2: Verify it type-checks and lints**

Run: `npx tsc --noEmit`
Expected: PASS.

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add proxy.ts
git commit -m "feat(short-links): route the dedicated short domain in proxy"
```

---

## Task 10: Create route + code-availability route

**Files:**
- Create: `app/api/links/route.ts`
- Create: `app/api/links/check-code/route.ts`

- [ ] **Step 1: Write the create route**

`app/api/links/route.ts`:

```ts
// POST /api/links — creator creates a short link (validated: destination URL
// safety + code validity/uniqueness + per-creator rate limit).

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveProfileId } from '@/lib/server/resolve-profile';
import { rateLimitKey } from '@/lib/server/rate-limit';
import { generateCode, isValidCode, normalizeCode } from '@/lib/server/shortlinks/code';
import { validateDestinationUrl } from '@/lib/server/shortlinks/url-safety';
import { getShortlinkDomain } from '@/lib/shared/shortlink';

interface CreateBody {
  destination_url?: string;
  code?: string;
  title?: string;
  tags?: string[];
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  expires_at?: string | null;
  expired_redirect_url?: string | null;
}

function appHostOf(appUrl?: string): string | undefined {
  if (!appUrl) return undefined;
  try { return new URL(appUrl).host; } catch { return undefined; }
}

async function generateUniqueCode(
  db: ReturnType<typeof createServiceClient>
): Promise<string> {
  for (let i = 0; i < 6; i++) {
    const candidate = generateCode(7);
    const { data } = await db.from('linksh_links').select('id').eq('code', candidate).maybeSingle();
    if (!data) return candidate;
  }
  return generateCode(9); // widen on repeated collisions
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const creatorId = await resolveProfileId(user.id, user.email);
    if (!creatorId) return NextResponse.json({ error: 'No creator profile' }, { status: 404 });

    if (!(await rateLimitKey(`links-create:${creatorId}`, { max: 30, windowSeconds: 60 }))) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = (await req.json().catch(() => null)) as CreateBody | null;
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

    const urlCheck = validateDestinationUrl(body.destination_url ?? '', {
      shortDomain: getShortlinkDomain(),
      appHost: appHostOf(process.env.NEXT_PUBLIC_APP_URL),
    });
    if (!urlCheck.ok) return NextResponse.json({ error: urlCheck.error }, { status: 400 });

    const db = createServiceClient();

    let code: string;
    if (body.code && body.code.trim()) {
      code = normalizeCode(body.code);
      if (!isValidCode(code)) {
        return NextResponse.json({ error: 'Code must be 3–50 chars: letters, numbers, - or _' }, { status: 400 });
      }
      const { data: taken } = await db.from('linksh_links').select('id').eq('code', code).maybeSingle();
      if (taken) return NextResponse.json({ error: 'That code is already taken' }, { status: 409 });
    } else {
      code = await generateUniqueCode(db);
    }

    const { data, error } = await db.from('linksh_links').insert({
      creator_id: creatorId,
      code,
      destination_url: urlCheck.url!,
      title: body.title?.trim() || null,
      tags: Array.isArray(body.tags) ? body.tags.slice(0, 20) : [],
      utm_source: body.utm_source?.trim() || null,
      utm_medium: body.utm_medium?.trim() || null,
      utm_campaign: body.utm_campaign?.trim() || null,
      utm_term: body.utm_term?.trim() || null,
      utm_content: body.utm_content?.trim() || null,
      expires_at: body.expires_at || null,
      expired_redirect_url: body.expired_redirect_url?.trim() || null,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ link: data }, { status: 201 });
  } catch (err) {
    console.error('[api/links POST]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Write the check-code route**

`app/api/links/check-code/route.ts`:

```ts
// GET /api/links/check-code?code=xxx — live availability for the create/edit UI.

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { isValidCode, normalizeCode } from '@/lib/server/shortlinks/code';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = normalizeCode(searchParams.get('code') ?? '');

  if (!isValidCode(code)) {
    return NextResponse.json({ available: false, error: 'Invalid code' }, { status: 400 });
  }

  const db = createServiceClient();
  const { data } = await db.from('linksh_links').select('id').eq('code', code).maybeSingle();
  return NextResponse.json({ available: data === null });
}
```

- [ ] **Step 3: Verify type-check + lint**

Run: `npx tsc --noEmit`
Expected: PASS.

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/api/links/route.ts app/api/links/check-code/route.ts
git commit -m "feat(short-links): create + check-code API routes"
```

---

## Task 11: Update + delete route `PATCH|DELETE /api/links/[id]`

**Files:**
- Create: `app/api/links/[id]/route.ts`

- [ ] **Step 1: Write the route**

`app/api/links/[id]/route.ts`:

```ts
// PATCH /api/links/[id] — edit a link (re-validates destination + code).
// DELETE /api/links/[id] — permanently delete. Both enforce ownership.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveProfileId } from '@/lib/server/resolve-profile';
import { isValidCode, normalizeCode } from '@/lib/server/shortlinks/code';
import { validateDestinationUrl } from '@/lib/server/shortlinks/url-safety';
import { getShortlinkDomain } from '@/lib/shared/shortlink';

interface PatchBody {
  destination_url?: string;
  code?: string;
  title?: string | null;
  tags?: string[];
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  expires_at?: string | null;
  expired_redirect_url?: string | null;
  is_active?: boolean;
  archived_at?: string | null;
}

function appHostOf(appUrl?: string): string | undefined {
  if (!appUrl) return undefined;
  try { return new URL(appUrl).host; } catch { return undefined; }
}

async function authCreator(req: Request): Promise<{ creatorId: string } | NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const creatorId = await resolveProfileId(user.id, user.email);
  if (!creatorId) return NextResponse.json({ error: 'No creator profile' }, { status: 404 });
  return { creatorId };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await authCreator(req);
    if (auth instanceof NextResponse) return auth;

    const body = (await req.json().catch(() => null)) as PatchBody | null;
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

    const db = createServiceClient();
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.destination_url !== undefined) {
      const check = validateDestinationUrl(body.destination_url, {
        shortDomain: getShortlinkDomain(),
        appHost: appHostOf(process.env.NEXT_PUBLIC_APP_URL),
      });
      if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });
      patch.destination_url = check.url;
    }

    if (body.code !== undefined) {
      const code = normalizeCode(body.code);
      if (!isValidCode(code)) return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
      const { data: taken } = await db
        .from('linksh_links').select('id').eq('code', code).neq('id', id).maybeSingle();
      if (taken) return NextResponse.json({ error: 'That code is already taken' }, { status: 409 });
      patch.code = code;
    }

    for (const key of ['title', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term',
      'utm_content', 'expires_at', 'expired_redirect_url', 'is_active', 'archived_at'] as const) {
      if (body[key] !== undefined) patch[key] = body[key];
    }
    if (body.tags !== undefined) patch.tags = Array.isArray(body.tags) ? body.tags.slice(0, 20) : [];

    const { data, error } = await db
      .from('linksh_links')
      .update(patch)
      .eq('id', id)
      .eq('creator_id', auth.creatorId)
      .select()
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ link: data });
  } catch (err) {
    console.error('[api/links PATCH]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await authCreator(req);
    if (auth instanceof NextResponse) return auth;

    const db = createServiceClient();
    const { error } = await db
      .from('linksh_links').delete().eq('id', id).eq('creator_id', auth.creatorId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error('[api/links DELETE]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify type-check + lint**

Run: `npx tsc --noEmit`
Expected: PASS.

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/api/links/[id]/route.ts
git commit -m "feat(short-links): update + delete API route"
```

---

## Task 12: `useShortLinks` hook

**Files:**
- Create: `src/hooks/marketing/useShortLinks.ts`

- [ ] **Step 1: Write the hook**

`src/hooks/marketing/useShortLinks.ts`:

```ts
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { getCreatorProfileId } from '@/lib/getCreatorProfileId';
import type { Database } from '@/types/database.types';

export type ShortLink = Database['public']['Tables']['linksh_links']['Row'];
export type ClickEvent = Database['public']['Tables']['linksh_click_events']['Row'];

export interface CreateLinkInput {
  destination_url: string;
  code?: string;
  title?: string;
  tags?: string[];
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  expires_at?: string | null;
  expired_redirect_url?: string | null;
}

export type UpdateLinkInput = Partial<CreateLinkInput> & {
  is_active?: boolean;
  archived_at?: string | null;
};

async function callJson(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? 'Request failed');
  return data;
}

export function useShortLinks() {
  const qc = useQueryClient();

  const { data: links = [], isLoading } = useQuery({
    queryKey: ['short-links', 'list'],
    queryFn: async () => {
      const creatorId = await getCreatorProfileId();
      const { data, error } = await supabase
        .from('linksh_links')
        .select('*')
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ShortLink[];
    },
  });

  const createLink = useMutation({
    mutationFn: (input: CreateLinkInput) => callJson('/api/links', 'POST', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['short-links'] }),
  });

  const updateLink = useMutation({
    mutationFn: ({ id, ...patch }: UpdateLinkInput & { id: string }) =>
      callJson(`/api/links/${id}`, 'PATCH', patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['short-links'] }),
  });

  const deleteLink = useMutation({
    mutationFn: (id: string) => callJson(`/api/links/${id}`, 'DELETE'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['short-links'] }),
  });

  return {
    links,
    isLoading,
    createLink: createLink.mutateAsync,
    isCreating: createLink.isPending,
    updateLink: updateLink.mutateAsync,
    isUpdating: updateLink.isPending,
    deleteLink: deleteLink.mutateAsync,
    isDeleting: deleteLink.isPending,
  };
}

export function useShortLinkAnalytics(linkId: string) {
  return useQuery({
    queryKey: ['short-links', 'analytics', linkId],
    enabled: !!linkId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('linksh_click_events')
        .select('*')
        .eq('link_id', linkId)
        .order('created_at', { ascending: false })
        .limit(5000);
      if (error) throw error;
      return data as ClickEvent[];
    },
  });
}
```

- [ ] **Step 2: Verify type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/marketing/useShortLinks.ts
git commit -m "feat(short-links): useShortLinks + useShortLinkAnalytics hooks"
```

---

## Task 13: QR button + create/edit drawer components

**Files:**
- Create: `src/components/dashboard/links/QRButton.tsx`
- Create: `src/components/dashboard/links/LinkFormDrawer.tsx`

- [ ] **Step 1: Write the QR button/modal**

`src/components/dashboard/links/QRButton.tsx`:

```tsx
'use client';

import { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { QrCode, Download, X } from 'lucide-react';

export function QRButton({ url, label }: { url: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const download = () => {
    const canvas = wrapRef.current?.querySelector('canvas');
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `${label || 'qr'}.png`;
    a.click();
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="QR code"
        className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
      >
        <QrCode className="w-4 h-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setOpen(false)}>
          <div
            className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] p-6 w-full max-w-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">QR code</h3>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div ref={wrapRef} className="flex justify-center rounded-[var(--radius-md)] bg-white p-4">
              <QRCodeCanvas value={url} size={200} level="M" includeMargin />
            </div>
            <p className="mt-3 text-center text-xs text-[var(--text-tertiary)] break-all">{url}</p>
            <button
              onClick={download}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-fg)] py-2 rounded-[var(--radius-sm)] text-sm font-semibold transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
            >
              <Download className="w-4 h-4" /> Download PNG
            </button>
          </div>
        </div>
      )}
    </>
  );
}
```

> If `includeMargin` triggers a TS prop error with the installed qrcode.react v4 types, drop it — it's cosmetic. `QRCodeCanvas` + `value`/`size`/`level` are stable across v4.

- [ ] **Step 2: Write the create/edit drawer**

`src/components/dashboard/links/LinkFormDrawer.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { ChevronDown, Check, Loader2 } from 'lucide-react';
import { SideDrawer } from '@/components/ui/SideDrawer';
import { getShortlinkDomain, shortUrl } from '@/lib/shared/shortlink';
import type { ShortLink, CreateLinkInput, UpdateLinkInput } from '@/hooks/marketing/useShortLinks';

const INPUT =
  'w-full px-3 py-2 text-sm border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-muted)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-strong)] focus:shadow-[var(--focus-ring)] transition-shadow';
const LABEL = 'block text-sm font-medium text-[var(--text-primary)] mb-1.5';

type Availability = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

export function LinkFormDrawer({
  open, onClose, editing, onCreate, onUpdate, busy,
}: {
  open: boolean;
  onClose: () => void;
  editing: ShortLink | null;
  onCreate: (input: CreateLinkInput) => Promise<unknown>;
  onUpdate: (input: UpdateLinkInput & { id: string }) => Promise<unknown>;
  busy: boolean;
}) {
  const [destination, setDestination] = useState('');
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [utm, setUtm] = useState({ source: '', medium: '', campaign: '', term: '', content: '' });
  const [expiresAt, setExpiresAt] = useState('');
  const [fallback, setFallback] = useState('');
  const [showUtm, setShowUtm] = useState(false);
  const [showExpiry, setShowExpiry] = useState(false);
  const [availability, setAvailability] = useState<Availability>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    setAvailability('idle');
    if (editing) {
      setDestination(editing.destination_url);
      setCode(editing.code);
      setTitle(editing.title ?? '');
      setTags((editing.tags ?? []).join(', '));
      setUtm({
        source: editing.utm_source ?? '', medium: editing.utm_medium ?? '',
        campaign: editing.utm_campaign ?? '', term: editing.utm_term ?? '',
        content: editing.utm_content ?? '',
      });
      setExpiresAt(editing.expires_at ? editing.expires_at.slice(0, 10) : '');
      setFallback(editing.expired_redirect_url ?? '');
    } else {
      setDestination(''); setCode(''); setTitle(''); setTags('');
      setUtm({ source: '', medium: '', campaign: '', term: '', content: '' });
      setExpiresAt(''); setFallback('');
    }
  }, [open, editing]);

  // Debounced code availability check (skip when unchanged in edit mode).
  useEffect(() => {
    if (!open || !code) { setAvailability('idle'); return; }
    if (editing && code === editing.code) { setAvailability('idle'); return; }
    setAvailability('checking');
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/links/check-code?code=${encodeURIComponent(code)}`);
        const data = await res.json();
        if (res.status === 400) setAvailability('invalid');
        else setAvailability(data.available ? 'available' : 'taken');
      } catch {
        setAvailability('idle');
      }
    }, 400);
    return () => clearTimeout(t);
  }, [code, open, editing]);

  const previewUrl = shortUrl(code || 'your-code');

  const submit = async () => {
    setError('');
    try {
      const payload = {
        destination_url: destination.trim(),
        code: code.trim() || undefined,
        title: title.trim() || undefined,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        utm_source: utm.source.trim() || undefined,
        utm_medium: utm.medium.trim() || undefined,
        utm_campaign: utm.campaign.trim() || undefined,
        utm_term: utm.term.trim() || undefined,
        utm_content: utm.content.trim() || undefined,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        expired_redirect_url: fallback.trim() || null,
      };
      if (editing) await onUpdate({ id: editing.id, ...payload });
      else await onCreate(payload);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    }
  };

  return (
    <SideDrawer
      isOpen={open}
      onClose={onClose}
      title={editing ? 'Edit link' : 'New short link'}
      footer={
        <button
          onClick={submit}
          disabled={busy || !destination.trim() || availability === 'taken' || availability === 'invalid'}
          className="w-full bg-[var(--brand)] hover:bg-[var(--brand-hover)] disabled:opacity-50 text-[var(--text-on-brand)] py-2.5 rounded-[var(--radius-sm)] text-sm font-semibold transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
        >
          {busy ? 'Saving…' : editing ? 'Save changes' : 'Create link'}
        </button>
      }
    >
      <div className="space-y-4">
        {/* Live preview */}
        <div className="flex items-center gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
          <div className="rounded-[var(--radius-md)] bg-white p-2 shrink-0">
            <QRCodeCanvas value={previewUrl} size={64} level="M" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-[var(--text-tertiary)] mb-1">Preview</p>
            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{previewUrl}</p>
          </div>
        </div>

        {error && (
          <div className="text-xs text-[var(--danger)] bg-[var(--danger-bg)] border border-[var(--danger)]/20 rounded-[var(--radius-sm)] px-3 py-2">
            {error}
          </div>
        )}

        <div>
          <label className={LABEL}>Destination URL</label>
          <input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="https://…" className={INPUT} />
        </div>

        <div>
          <label className={LABEL}>Short link</label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--text-tertiary)] shrink-0">{getShortlinkDomain() || 'linkme.you'}/</span>
            <div className="relative flex-1">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toLowerCase())}
                placeholder="auto-generated if empty"
                className={INPUT}
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2">
                {availability === 'checking' && <Loader2 className="w-4 h-4 animate-spin text-[var(--text-tertiary)]" />}
                {availability === 'available' && <Check className="w-4 h-4 text-[var(--success)]" />}
              </span>
            </div>
          </div>
          {availability === 'taken' && <p className="mt-1 text-xs text-[var(--danger)]">That code is taken.</p>}
          {availability === 'invalid' && <p className="mt-1 text-xs text-[var(--danger)]">3–50 chars: letters, numbers, - or _.</p>}
        </div>

        <div>
          <label className={LABEL}>Title <span className="text-[var(--text-tertiary)] font-normal">optional</span></label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Spring sale promo" className={INPUT} />
        </div>

        <div>
          <label className={LABEL}>Tags <span className="text-[var(--text-tertiary)] font-normal">comma-separated</span></label>
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="promo, instagram" className={INPUT} />
        </div>

        {/* UTM section */}
        <button
          type="button"
          onClick={() => setShowUtm((v) => !v)}
          className="flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] rounded"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${showUtm ? 'rotate-180' : ''}`} /> UTM parameters
        </button>
        {showUtm && (
          <div className="grid grid-cols-2 gap-3">
            {(['source', 'medium', 'campaign', 'term', 'content'] as const).map((k) => (
              <div key={k}>
                <label className="block text-xs text-[var(--text-tertiary)] mb-1 capitalize">{k}</label>
                <input value={utm[k]} onChange={(e) => setUtm((p) => ({ ...p, [k]: e.target.value }))} className={INPUT} />
              </div>
            ))}
          </div>
        )}

        {/* Expiration section */}
        <button
          type="button"
          onClick={() => setShowExpiry((v) => !v)}
          className="flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] rounded"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${showExpiry ? 'rotate-180' : ''}`} /> Expiration
        </button>
        {showExpiry && (
          <div className="space-y-3">
            <div>
              <label className={LABEL}>Expires on</label>
              <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Fallback URL when expired</label>
              <input value={fallback} onChange={(e) => setFallback(e.target.value)} placeholder="https://…" className={INPUT} />
            </div>
          </div>
        )}
      </div>
    </SideDrawer>
  );
}
```

- [ ] **Step 3: Verify type-check + lint**

Run: `npx tsc --noEmit`
Expected: PASS.

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/links/QRButton.tsx src/components/dashboard/links/LinkFormDrawer.tsx
git commit -m "feat(short-links): QR button + create/edit drawer"
```

---

## Task 14: Link card + list page

**Files:**
- Create: `src/components/dashboard/links/LinkCard.tsx`
- Create: `app/dashboard/links/page.tsx`

- [ ] **Step 1: Write the link card**

`src/components/dashboard/links/LinkCard.tsx`:

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Copy, Check, BarChart2, MoreHorizontal, Pencil, Trash2, Pause, Play, Link2 } from 'lucide-react';
import { StatusPill } from '@/components/ui/StatusPill';
import { QRButton } from './QRButton';
import { shortUrl } from '@/lib/shared/shortlink';
import type { ShortLink } from '@/hooks/marketing/useShortLinks';

function faviconUrl(destination: string): string | null {
  try {
    const host = new URL(destination).host;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
  } catch {
    return null;
  }
}

function statusOf(link: ShortLink): string {
  if (link.archived_at) return 'archived';
  if (link.expires_at && new Date(link.expires_at).getTime() < Date.now()) return 'expired';
  return link.is_active ? 'active' : 'inactive';
}

export function LinkCard({
  link, onEdit, onToggle, onArchive, onDelete,
}: {
  link: ShortLink;
  onEdit: (l: ShortLink) => void;
  onToggle: (l: ShortLink) => void;
  onArchive: (l: ShortLink) => void;
  onDelete: (l: ShortLink) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [menu, setMenu] = useState(false);
  const url = shortUrl(link.code);
  const fav = faviconUrl(link.destination_url);

  const copy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--surface-hover)] transition group">
      {/* Favicon well */}
      <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--surface-muted)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0 overflow-hidden">
        {fav ? (
          <img src={fav} alt="" className="w-5 h-5" onError={(e) => { (e.currentTarget.style.display = 'none'); }} />
        ) : (
          <Link2 className="w-4 h-4 text-[var(--text-tertiary)]" />
        )}
      </div>

      {/* Main */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-[var(--text-primary)] truncate">{url}</span>
          <button onClick={copy} title="Copy" className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
            {copied ? <Check className="w-3.5 h-3.5 text-[var(--success)]" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <QRButton url={url} label={link.code} />
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-[var(--text-secondary)] truncate">{link.destination_url}</span>
          {(link.tags ?? []).slice(0, 3).map((t) => (
            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-[var(--radius-sm)] bg-[var(--surface-muted)] text-[var(--text-tertiary)]">#{t}</span>
          ))}
        </div>
      </div>

      {/* Clicks */}
      <Link
        href={`/dashboard/links/${link.id}`}
        className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition shrink-0 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] rounded px-1"
      >
        <BarChart2 className="w-4 h-4" />
        <span className="font-semibold text-[var(--text-primary)]">{link.click_count.toLocaleString('en-IN')}</span>
        <span className="hidden sm:inline text-xs">clicks</span>
      </Link>

      <StatusPill status={statusOf(link)} />

      {/* Overflow */}
      <div className="relative shrink-0">
        <button
          onClick={() => setMenu((v) => !v)}
          className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
        {menu && (
          <div
            className="absolute right-0 top-full mt-1 w-40 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] shadow-[var(--shadow-md)] py-1 z-20"
            onMouseLeave={() => setMenu(false)}
          >
            <MenuItem icon={Pencil} label="Edit" onClick={() => { setMenu(false); onEdit(link); }} />
            <MenuItem
              icon={link.is_active ? Pause : Play}
              label={link.is_active ? 'Pause' : 'Resume'}
              onClick={() => { setMenu(false); onToggle(link); }}
            />
            <MenuItem icon={BarChart2} label={link.archived_at ? 'Unarchive' : 'Archive'} onClick={() => { setMenu(false); onArchive(link); }} />
            <MenuItem icon={Trash2} label="Delete" danger onClick={() => { setMenu(false); onDelete(link); }} />
          </div>
        )}
      </div>
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger }: {
  icon: typeof Pencil; label: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${
        danger
          ? 'text-[var(--danger)] hover:bg-[var(--danger-bg)]'
          : 'text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
      }`}
    >
      <Icon className="w-4 h-4" /> {label}
    </button>
  );
}
```

- [ ] **Step 2: Write the list page**

`app/dashboard/links/page.tsx`:

```tsx
'use client';

import { useMemo, useState } from 'react';
import { Plus, Search, Link2, MousePointerClick, Zap } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { KpiGrid } from '@/components/ui/KpiGrid';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { useShortLinks, type ShortLink } from '@/hooks/marketing/useShortLinks';
import { LinkCard } from '@/components/dashboard/links/LinkCard';
import { LinkFormDrawer } from '@/components/dashboard/links/LinkFormDrawer';

export default function ShortLinksPage() {
  const { links, isLoading, createLink, isCreating, updateLink, isUpdating, deleteLink } = useShortLinks();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<ShortLink | null>(null);
  const [search, setSearch] = useState('');

  const stats = useMemo(() => ({
    total: links.length,
    clicks: links.reduce((a, l) => a + Number(l.click_count), 0),
    active: links.filter((l) => l.is_active && !l.archived_at).length,
  }), [links]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return links;
    return links.filter((l) =>
      l.code.toLowerCase().includes(q) ||
      l.destination_url.toLowerCase().includes(q) ||
      (l.title ?? '').toLowerCase().includes(q) ||
      (l.tags ?? []).some((t) => t.toLowerCase().includes(q))
    );
  }, [links, search]);

  const openCreate = () => { setEditing(null); setDrawerOpen(true); };
  const openEdit = (l: ShortLink) => { setEditing(l); setDrawerOpen(true); };
  const toggle = (l: ShortLink) => updateLink({ id: l.id, is_active: !l.is_active });
  const archive = (l: ShortLink) => updateLink({ id: l.id, archived_at: l.archived_at ? null : new Date().toISOString() });
  const remove = (l: ShortLink) => { if (confirm(`Delete ${l.code}? This cannot be undone.`)) deleteLink(l.id); };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Short Links"
        description="Create branded short links, track clicks, and share anywhere."
        action={
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-on-brand)] px-4 py-2 rounded-[var(--radius-sm)] text-sm font-semibold transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          >
            <Plus className="w-4 h-4" /> Create link
          </button>
        }
      />

      <KpiGrid>
        <StatCard label="Total links" value={stats.total} icon={Link2} />
        <StatCard label="Total clicks" value={stats.clicks.toLocaleString('en-IN')} icon={MousePointerClick} />
        <StatCard label="Active" value={stats.active} icon={Zap} />
      </KpiGrid>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search links…"
          className="w-full pl-9 pr-4 py-2 text-sm border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-muted)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-strong)] focus:shadow-[var(--focus-ring)] transition-shadow"
        />
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden shadow-[var(--shadow-xs)]">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-[var(--text-tertiary)]">Loading…</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Link2}
            title={search ? 'No matching links' : 'No short links yet'}
            description={search ? 'Try a different search.' : 'Create your first branded short link to start tracking clicks.'}
            action={
              !search ? (
                <button
                  onClick={openCreate}
                  className="flex items-center gap-2 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-on-brand)] px-4 py-2 rounded-[var(--radius-sm)] text-sm font-semibold transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                >
                  <Plus className="w-4 h-4" /> Create link
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {filtered.map((l) => (
              <LinkCard key={l.id} link={l} onEdit={openEdit} onToggle={toggle} onArchive={archive} onDelete={remove} />
            ))}
          </div>
        )}
      </div>

      <LinkFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        editing={editing}
        onCreate={createLink}
        onUpdate={updateLink}
        busy={isCreating || isUpdating}
      />
    </div>
  );
}
```

- [ ] **Step 3: Verify type-check + lint**

Run: `npx tsc --noEmit`
Expected: PASS.

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 4: Manual check**

Run `npm run dev`, open `http://localhost:3000/dashboard/links`. Create a link, confirm it appears, copy/QR work, toggle/archive/delete work. Toggle dark mode — tokens flip correctly.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/links/LinkCard.tsx app/dashboard/links/page.tsx
git commit -m "feat(short-links): dashboard list page + link cards"
```

---

## Task 15: Analytics detail page

**Files:**
- Create: `src/components/dashboard/links/BreakdownList.tsx`
- Create: `src/components/dashboard/links/ClicksChart.tsx`
- Create: `app/dashboard/links/[id]/page.tsx`

- [ ] **Step 1: Write the breakdown list**

`src/components/dashboard/links/BreakdownList.tsx`:

```tsx
'use client';

export function BreakdownList({ title, rows }: { title: string; rows: Array<{ label: string; count: number }> }) {
  const max = rows.reduce((m, r) => Math.max(m, r.count), 0) || 1;
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5 shadow-[var(--shadow-xs)]">
      <h3 className="text-base font-semibold text-[var(--text-primary)] mb-4">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-[var(--text-tertiary)]">No data yet.</p>
      ) : (
        <div className="space-y-2.5">
          {rows.slice(0, 8).map((r) => (
            <div key={r.label} className="flex items-center gap-3">
              <span className="text-sm text-[var(--text-secondary)] w-28 truncate shrink-0">{r.label}</span>
              <div className="flex-1 h-2 bg-[var(--surface-muted)] rounded-full overflow-hidden">
                <div className="h-full bg-[var(--brand)] rounded-full" style={{ width: `${(r.count / max) * 100}%` }} />
              </div>
              <span className="text-xs text-[var(--text-tertiary)] w-10 text-right shrink-0">{r.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write the clicks chart**

`src/components/dashboard/links/ClicksChart.tsx`:

```tsx
'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function ClicksChart({ data }: { data: Array<{ date: string; clicks: number }> }) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5 shadow-[var(--shadow-xs)]">
      <h3 className="text-base font-semibold text-[var(--text-primary)] mb-4">Clicks over time</h3>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="clk" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border-subtle)" vertical={false} />
          <XAxis dataKey="date" stroke="var(--border-subtle)" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} />
          <YAxis stroke="var(--border-subtle)" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)', fontSize: 12,
            }}
          />
          <Area type="monotone" dataKey="clicks" stroke="var(--brand)" strokeWidth={2} fill="url(#clk)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 3: Write the analytics page**

`app/dashboard/links/[id]/page.tsx`:

```tsx
'use client';

import { use, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, MousePointerClick, Users, Globe, Link2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { KpiGrid } from '@/components/ui/KpiGrid';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { QRButton } from '@/components/dashboard/links/QRButton';
import { ClicksChart } from '@/components/dashboard/links/ClicksChart';
import { BreakdownList } from '@/components/dashboard/links/BreakdownList';
import { useShortLinks, useShortLinkAnalytics, type ClickEvent } from '@/hooks/marketing/useShortLinks';
import { shortUrl } from '@/lib/shared/shortlink';

function countBy(events: ClickEvent[], key: (e: ClickEvent) => string | null): Array<{ label: string; count: number }> {
  const map = new Map<string, number>();
  for (const e of events) {
    const k = key(e) || 'Unknown';
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
}

export default function LinkAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { links } = useShortLinks();
  const { data: events = [], isLoading } = useShortLinkAnalytics(id);
  const link = links.find((l) => l.id === id);

  const uniqueClicks = useMemo(() => events.filter((e) => e.is_unique).length, [events]);

  const series = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const e of events) {
      const d = e.created_at.slice(0, 10);
      byDay.set(d, (byDay.get(d) ?? 0) + 1);
    }
    return [...byDay.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, clicks]) => ({ date: date.slice(5), clicks }));
  }, [events]);

  const countries = useMemo(() => countBy(events, (e) => e.country), [events]);
  const referrers = useMemo(() => countBy(events, (e) => {
    if (!e.referrer_url) return 'Direct';
    try { return new URL(e.referrer_url).host; } catch { return 'Direct'; }
  }), [events]);

  const url = link ? shortUrl(link.code) : '';

  return (
    <div className="space-y-6 pb-12">
      <div className="pt-6">
        <Link href="/dashboard/links" className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] rounded">
          <ArrowLeft className="w-4 h-4" /> Back to links
        </Link>
      </div>

      <PageHeader
        title={link?.title || link?.code || 'Link analytics'}
        description={url}
        action={link ? <QRButton url={url} label={link.code} /> : undefined}
      />

      <KpiGrid>
        <StatCard label="Total clicks" value={(link?.click_count ?? 0).toLocaleString('en-IN')} icon={MousePointerClick} />
        <StatCard label="Unique clicks" value={uniqueClicks.toLocaleString('en-IN')} icon={Users} />
        <StatCard label="Top country" value={countries[0]?.label ?? '—'} icon={Globe} />
        <StatCard label="Top referrer" value={referrers[0]?.label ?? '—'} icon={Link2} />
      </KpiGrid>

      {isLoading ? (
        <div className="p-10 text-center text-sm text-[var(--text-tertiary)]">Loading…</div>
      ) : events.length === 0 ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)]">
          <EmptyState icon={MousePointerClick} title="No clicks yet" description="Share this link to start seeing analytics." />
        </div>
      ) : (
        <>
          <ClicksChart data={series} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BreakdownList title="Countries" rows={countries} />
            <BreakdownList title="Referrers" rows={referrers} />
            <BreakdownList title="Devices" rows={countBy(events, (e) => e.device_type)} />
            <BreakdownList title="Browsers" rows={countBy(events, (e) => e.browser)} />
            <BreakdownList title="Operating systems" rows={countBy(events, (e) => e.os)} />
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify type-check + lint**

Run: `npx tsc --noEmit`
Expected: PASS.

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/links/BreakdownList.tsx src/components/dashboard/links/ClicksChart.tsx app/dashboard/links/[id]/page.tsx
git commit -m "feat(short-links): per-link analytics detail page"
```

---

## Task 16: Sidebar nav + docs + final verification

**Files:**
- Modify: `src/components/dashboard/Sidebar.tsx`
- Modify: `.claude/rules/env-vars.md`
- Modify: `.env.example`
- Modify: `.claude/rules/api-routes.md`
- Modify: `.claude/rules/hooks-reference.md`
- Modify: `docs/reference/dashboard-map.md`

- [ ] **Step 1: Add the Sidebar nav item**

In `src/components/dashboard/Sidebar.tsx`, add `Link2` to the lucide import block (line 7–13), then add this entry to the **`grow`** group's `items` array (after the `Community` item, before `Marketing`):

```tsx
      { label: 'Short Links', href: '/dashboard/links', icon: Link2 },
```

- [ ] **Step 2: Add the env var to `.env.example`**

Append to `.env.example` (near the app/public section):

```
# Dedicated short-link domain (bare-root redirector). No scheme, no trailing slash.
NEXT_PUBLIC_SHORTLINK_DOMAIN=linkme.you
```

- [ ] **Step 3: Document the env var in `.claude/rules/env-vars.md`**

Under the `## App` table, add a row:

```
| `NEXT_PUBLIC_SHORTLINK_DOMAIN` | public | `proxy.ts`, `src/lib/shared/shortlink.ts` | Dedicated short-link domain (e.g. `linkme.you`). Bare-root `{domain}/{code}` redirects. No scheme/trailing slash. Unset → short-link routing disabled. |
```

- [ ] **Step 4: Document the routes in `.claude/rules/api-routes.md`**

Add these rows to the "At a glance" table:

```
| GET | `/api/s/[code]` | none (public) | service role | — (reads `linksh_links`; writes `linksh_click_events` + counters via `linksh_record_click`, post-response) |
| POST | `/api/links` | cookie session | server + service role | `linksh_links` (create; URL-safety + code validation + per-creator rate limit) |
| PATCH/DELETE | `/api/links/[id]` | cookie session | server + service role | `linksh_links` (owner-scoped edit / delete) |
| GET | `/api/links/check-code` | none (public) | service role | — (code availability) |
```

- [ ] **Step 5: Document the hook in `.claude/rules/hooks-reference.md`**

Add to the `marketing/` subfolder line: `useShortLinks`. Add to the normalized-keys table:

```
| `useShortLinks()` | `['short-links','list']` |
| `useShortLinkAnalytics(id)` | `['short-links','analytics', id]` |
```

- [ ] **Step 6: Add the page row to `docs/reference/dashboard-map.md`**

Add a row to the Pages table (keep it alphabetical near `/dashboard/media`):

```
| `/dashboard/links` | Short Links — modern-shortener UI: link-card list (favicon + inline copy/QR + click badge), create/edit `SideDrawer` with live QR preview + code availability, tag search. `/dashboard/links/[id]` = analytics detail (KPIs, recharts time-series, country/device/browser/OS/referrer breakdowns). | `useShortLinks`, `useShortLinkAnalytics` | `PageHeader`, `KpiGrid`, `StatCard`, `EmptyState`, `SideDrawer`, `StatusPill` | `POST /api/links`, `PATCH/DELETE /api/links/[id]`, `GET /api/links/check-code`, `GET /api/s/[code]` (redirect) | `linksh_links` owner-CRUD via RLS (`current_profile_id()`); `linksh_click_events` SELECT-own; writes via service-role routes |
```

- [ ] **Step 7: Full verification gauntlet**

Run: `npx tsc --noEmit`
Expected: PASS.

Run: `npm run lint`
Expected: PASS.

Run: `npm test`
Expected: PASS — all suites including the 6 new short-link libs.

Run (PowerShell — residual hardcoded-color grep on the new UI):
```powershell
Select-String -Path app\dashboard\links\*.tsx,app\dashboard\links\[id]\*.tsx,src\components\dashboard\links\*.tsx -Pattern "bg-(white|gray|zinc|emerald|red|amber|blue|indigo)|text-(gray|zinc|emerald|red|amber|blue)|border-(gray|zinc|emerald)|dark:"
```
Expected: no hits (acceptable false positives: `bg-white` on the QR canvas wells — those are intentional literal-white surfaces for QR contrast).

- [ ] **Step 8: Manual end-to-end**

With `NEXT_PUBLIC_SHORTLINK_DOMAIN` set locally and `npm run dev`: create a link at `/dashboard/links`, hit `http://localhost:3000/api/s/{code}` (the proxy-rewrite path is only exercised on the real short domain in prod), confirm the 302 and a new `linksh_click_events` row, then open `/dashboard/links/[id]` and confirm the KPIs + chart + breakdowns render. Toggle dark mode.

- [ ] **Step 9: Commit**

```bash
git add src/components/dashboard/Sidebar.tsx .env.example .claude/rules/env-vars.md .claude/rules/api-routes.md .claude/rules/hooks-reference.md docs/reference/dashboard-map.md
git commit -m "feat(short-links): sidebar nav + env + docs"
```

---

## Done criteria

- All 16 tasks committed on `feat/short-links`.
- `npx tsc --noEmit`, `npm run lint`, `npm test` all pass.
- A creator can create/edit/pause/archive/delete short links, share `{shortdomain}/{code}`, and view per-link click analytics.
- New tables have RLS enabled + policies; all writes to `linksh_*` go through service-role routes or the owner RLS policy; the redirect is 302 + `no-store`; clicks are idempotent via `linksh_record_click`.

## Deferred (not in this plan — see spec §3)

Password protection, device/geo targeting, custom OG cards, max-click limits, per-creator branded short domains, daily rollups, shared-cache invalidation, and the Phase 3 attribution wedge.
