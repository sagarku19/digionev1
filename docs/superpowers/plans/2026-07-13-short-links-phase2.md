---
noteId: "14b60c707e2911f1b7ddffeec518d7f9"
tags: []

---

# Short Links — Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add Phase 2 paid-tier features to the shipped short-link MVP: password-protected links, iOS/Android device targeting, geo targeting, custom OG preview cards, and max-click limits. (Per-creator branded domains and Phase 3 attribution are explicitly out of scope.)

**Architecture:** All five features layer onto the existing `linksh_links` table via new nullable columns — no new tables. The redirect route (`app/api/s/[code]/route.ts`) grows from a pure 302 into a resolver: disabled/expired/**max-clicks** bounce → **social-crawler OG shell** → **password gate** (interstitial + POST verify + unlock cookie) → **geo→device→default** destination selection. Pure, unit-tested libs do password hashing, destination targeting, crawler detection, HTML rendering, and input sanitization. The create/edit routes + drawer accept the new fields.

**Tech Stack:** Next.js 16 route handlers (GET + POST), Node `crypto` (scrypt — no new package), TypeScript strict, Supabase service client, Vitest, lucide-react.

**Spec:** `docs/superpowers/specs/2026-07-12-short-links-design.md` (§3 Phase 2).
**Branch:** `feat/short-links` (already checked out; Phase 1 is committed on it).

**Precedence (locked):** In the redirect: (1) not found → app; (2) `!is_active || archived_at || expired || click_count ≥ max_clicks` → `expired_redirect_url` or app; (3) social crawler AND any OG field set → OG HTML (no tracking); (4) `password_hash` set AND no valid unlock cookie → interstitial; (5) destination = **geo match → device match → default**, then UTM, then 302 + track.

---

## File structure

**Migration:** add columns to `linksh_links` + regen `types/database.types.ts`.

**New pure libs (unit-tested):**
- `src/lib/server/shortlinks/password.ts` — `hashPassword`, `verifyPassword`, `unlockToken`.
- `src/lib/server/shortlinks/targeting.ts` — `pickDestination`.
- `src/lib/server/shortlinks/crawler.ts` — `isSocialCrawler`.
- `src/lib/server/shortlinks/html.ts` — `escapeHtml`, `renderOgHtml`, `renderUnlockHtml`.
- `src/lib/server/shortlinks/link-input.ts` — `sanitizePhase2Fields`.

**Modified:**
- `app/api/s/[code]/route.ts` — full rewrite (GET + new POST).
- `app/api/links/route.ts` + `app/api/links/[id]/route.ts` — accept/persist new fields.
- `src/hooks/marketing/useShortLinks.ts` — extend `CreateLinkInput`/`UpdateLinkInput`.
- `src/components/dashboard/links/LinkFormDrawer.tsx` — new form sections.
- `src/components/dashboard/links/LinkCard.tsx` — a small "protected" indicator.
- Docs: `.claude/rules/api-routes.md`, `docs/reference/dashboard-map.md`.

---

## Task 1: Migration — new columns + regenerated types

**Files:**
- Create: `supabase/migrations/20260713120000_short_links_phase2.sql`
- Modify: `types/database.types.ts` (regenerated)

- [ ] **Step 1: Write the migration**

`supabase/migrations/20260713120000_short_links_phase2.sql`:

```sql
-- Short Links Phase 2: password protection, device/geo targeting,
-- custom OG cards, max-click limits. All additive nullable columns.
alter table public.linksh_links
  add column if not exists password_hash text,
  add column if not exists ios_url text,
  add column if not exists android_url text,
  add column if not exists geo jsonb,
  add column if not exists og_title text,
  add column if not exists og_description text,
  add column if not exists og_image text,
  add column if not exists max_clicks bigint;
```

- [ ] **Step 2: Apply via Supabase MCP**

```
mcp__plugin_supabase_supabase__apply_migration
  project_id: qcendfisvyjnwmefruba
  name: short_links_phase2
  query: <the SQL above>
```

Expected: success. Verify with:
```
mcp__plugin_supabase_supabase__execute_sql
  project_id: qcendfisvyjnwmefruba
  query: select column_name from information_schema.columns where table_name='linksh_links' and column_name in ('password_hash','ios_url','android_url','geo','og_title','og_description','og_image','max_clicks') order by column_name;
```
Expected: all 8 rows.

- [ ] **Step 3: Regenerate types (Windows MCP path)**

```
mcp__plugin_supabase_supabase__generate_typescript_types
  project_id: qcendfisvyjnwmefruba
```
Then strip the JSON envelope and write `types/database.types.ts` (Python, `newline='\n'`) — same procedure as Phase 1 Task 1.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit` → PASS.
Run (PowerShell): `Select-String -Path types\database.types.ts -Pattern "password_hash","max_clicks"` → both matched.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260713120000_short_links_phase2.sql types/database.types.ts
git commit -m "feat(short-links): phase 2 columns (password/targeting/og/max-clicks)"
```

---

## Task 2: Pure libs (TDD batch)

**Files (create each + its `.test.ts`):**
- `src/lib/server/shortlinks/password.ts`
- `src/lib/server/shortlinks/targeting.ts`
- `src/lib/server/shortlinks/crawler.ts`
- `src/lib/server/shortlinks/html.ts`
- `src/lib/server/shortlinks/link-input.ts`

Each is strict TDD: write the failing test, run it (`npx vitest run <path>`), implement, run to pass, then a single commit for the batch at the end. Run `npm test` at the end to confirm the whole suite.

- [ ] **Step 1 — password.ts (test first)**

`src/lib/server/shortlinks/password.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, unlockToken } from './password';

describe('password', () => {
  it('hashes then verifies the same password', () => {
    const stored = hashPassword('s3cret!');
    expect(stored.startsWith('scrypt$')).toBe(true);
    expect(verifyPassword('s3cret!', stored)).toBe(true);
  });
  it('rejects a wrong password', () => {
    const stored = hashPassword('s3cret!');
    expect(verifyPassword('nope', stored)).toBe(false);
  });
  it('rejects malformed stored values', () => {
    expect(verifyPassword('x', 'garbage')).toBe(false);
    expect(verifyPassword('x', 'scrypt$only')).toBe(false);
  });
  it('produces a deterministic, per-link unlock token', () => {
    expect(unlockToken('abc', 'HASH')).toBe(unlockToken('abc', 'HASH'));
    expect(unlockToken('abc', 'HASH')).not.toBe(unlockToken('xyz', 'HASH'));
    expect(unlockToken('abc', 'HASH')).not.toBe(unlockToken('abc', 'OTHER'));
  });
});
```

Implementation `src/lib/server/shortlinks/password.ts`:

```ts
import { scryptSync, randomBytes, timingSafeEqual, createHash } from 'crypto';

// Password hashing for protected short links — scrypt, no external dependency.
// Stored format: "scrypt$<saltHex>$<hashHex>".

export function hashPassword(plain: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(plain, salt, 32);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  try {
    const salt = Buffer.from(parts[1], 'hex');
    const expected = Buffer.from(parts[2], 'hex');
    const actual = scryptSync(plain, salt, expected.length);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

// Unguessable per-link unlock token stored in the visitor's cookie after a
// correct password. Derived from the (secret) stored hash — can't be forged
// without knowing the hash.
export function unlockToken(code: string, passwordHash: string): string {
  return createHash('sha256').update(`${code}:${passwordHash}`).digest('hex');
}
```

- [ ] **Step 2 — targeting.ts (test first)**

`src/lib/server/shortlinks/targeting.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { pickDestination } from './targeting';

const base = { destination_url: 'https://default.com', ios_url: null, android_url: null, geo: null };

describe('pickDestination', () => {
  it('returns the default when nothing matches', () => {
    expect(pickDestination(base, { country: 'US', os: 'Windows' })).toBe('https://default.com');
  });
  it('geo match wins over everything', () => {
    const link = { ...base, ios_url: 'https://ios.com', geo: { IN: 'https://in.com' } };
    expect(pickDestination(link, { country: 'IN', os: 'iOS' })).toBe('https://in.com');
  });
  it('is case-insensitive on country code', () => {
    const link = { ...base, geo: { US: 'https://us.com' } };
    expect(pickDestination(link, { country: 'us', os: 'iOS' })).toBe('https://us.com');
  });
  it('falls back to device when geo misses', () => {
    const link = { ...base, ios_url: 'https://ios.com', android_url: 'https://and.com', geo: { US: 'https://us.com' } };
    expect(pickDestination(link, { country: 'IN', os: 'iOS' })).toBe('https://ios.com');
    expect(pickDestination(link, { country: 'IN', os: 'Android' })).toBe('https://and.com');
  });
  it('falls back to default when device has no url', () => {
    const link = { ...base, ios_url: 'https://ios.com' };
    expect(pickDestination(link, { country: null, os: 'Android' })).toBe('https://default.com');
  });
});
```

Implementation `src/lib/server/shortlinks/targeting.ts`:

```ts
// Chooses the destination for a click: geo match → device match → default. Pure.

export interface TargetableLink {
  destination_url: string;
  ios_url: string | null;
  android_url: string | null;
  geo: unknown; // jsonb: { [countryCode: string]: string } | null
}

export function pickDestination(
  link: TargetableLink,
  ctx: { country: string | null; os: string }
): string {
  if (link.geo && typeof link.geo === 'object' && ctx.country) {
    const map = link.geo as Record<string, unknown>;
    const url = map[ctx.country.toUpperCase()];
    if (typeof url === 'string' && url) return url;
  }
  if (ctx.os === 'iOS' && link.ios_url) return link.ios_url;
  if (ctx.os === 'Android' && link.android_url) return link.android_url;
  return link.destination_url;
}
```

- [ ] **Step 3 — crawler.ts (test first)**

`src/lib/server/shortlinks/crawler.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { isSocialCrawler } from './crawler';

describe('isSocialCrawler', () => {
  it('flags social preview crawlers', () => {
    expect(isSocialCrawler('facebookexternalhit/1.1')).toBe(true);
    expect(isSocialCrawler('Twitterbot/1.0')).toBe(true);
    expect(isSocialCrawler('WhatsApp/2.23')).toBe(true);
    expect(isSocialCrawler('LinkedInBot/1.0')).toBe(true);
  });
  it('does not flag a real browser or null', () => {
    expect(isSocialCrawler('Mozilla/5.0 (Windows NT 10.0) Chrome/120')).toBe(false);
    expect(isSocialCrawler(null)).toBe(false);
  });
});
```

Implementation `src/lib/server/shortlinks/crawler.ts`:

```ts
// Detects social / link-preview crawlers that should get an OG meta shell
// instead of a 302, so shared links render a rich preview.

export function isSocialCrawler(ua: string | null | undefined): boolean {
  if (!ua) return false;
  return /facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|slack-imgproxy|discordbot|whatsapp|telegrambot|pinterest|redditbot|skypeuripreview|vkshare|embedly|quora link preview|outbrain|bitlybot|nuzzel|bufferbot|flipboard|applebot|googlebot/i.test(ua);
}
```

- [ ] **Step 4 — html.ts (test first)**

`src/lib/server/shortlinks/html.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { escapeHtml, renderOgHtml, renderUnlockHtml } from './html';

describe('html', () => {
  it('escapes HTML-significant characters', () => {
    expect(escapeHtml(`<a href="x">&'`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;');
  });
  it('renders OG meta with escaped, injected values', () => {
    const out = renderOgHtml({ title: 'Hi <b>', description: 'd', image: 'https://i/x.png', url: 'https://dest.com' });
    expect(out).toContain('property="og:title" content="Hi &lt;b&gt;"');
    expect(out).toContain('property="og:image" content="https://i/x.png"');
    expect(out).toContain('http-equiv="refresh" content="0;url=https://dest.com"');
    expect(out).toContain('summary_large_image');
  });
  it('renders an unlock form posting to the action', () => {
    const out = renderUnlockHtml({ action: '/api/s/abc' });
    expect(out).toContain('method="POST" action="/api/s/abc"');
    expect(out).toContain('name="password"');
    expect(out).not.toContain('Incorrect password');
  });
  it('shows an error message when error=true', () => {
    expect(renderUnlockHtml({ action: '/api/s/abc', error: true })).toContain('Incorrect password');
  });
});
```

Implementation `src/lib/server/shortlinks/html.ts`:

```ts
// Minimal HTML the redirect route serves for OG previews (crawlers) and the
// password interstitial (humans). All interpolated values are creator-supplied
// → always escape.

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function renderOgHtml(og: {
  title?: string | null; description?: string | null; image?: string | null; url: string;
}): string {
  const title = escapeHtml(og.title || 'Link');
  const desc = og.description ? escapeHtml(og.description) : '';
  const image = og.image ? escapeHtml(og.image) : '';
  const url = escapeHtml(og.url);
  return `<!doctype html><html><head><meta charset="utf-8">
<meta property="og:type" content="website">
<meta property="og:title" content="${title}">
${desc ? `<meta property="og:description" content="${desc}">\n` : ''}${image ? `<meta property="og:image" content="${image}">\n` : ''}<meta property="og:url" content="${url}">
<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">
<meta name="twitter:title" content="${title}">
${desc ? `<meta name="twitter:description" content="${desc}">\n` : ''}${image ? `<meta name="twitter:image" content="${image}">\n` : ''}<title>${title}</title>
<meta http-equiv="refresh" content="0;url=${url}"></head>
<body><a href="${url}">Continue</a></body></html>`;
}

export function renderUnlockHtml(opts: { action: string; error?: boolean }): string {
  const action = escapeHtml(opts.action);
  const err = opts.error
    ? `<p style="color:#E83A2E;font-size:13px;margin:0 0 12px">Incorrect password. Try again.</p>`
    : '';
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Protected link</title></head>
<body style="margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#FAF8F6;color:#16130F;display:flex;min-height:100vh;align-items:center;justify-content:center">
<form method="POST" action="${action}" style="background:#fff;border:1px solid rgba(0,0,0,.1);border-radius:16px;padding:28px;max-width:340px;width:calc(100% - 32px);box-shadow:0 16px 50px -30px rgba(22,19,15,.25)">
<h1 style="font-size:18px;margin:0 0 6px">Password required</h1>
<p style="font-size:13px;color:rgba(0,0,0,.55);margin:0 0 16px">This link is protected. Enter the password to continue.</p>
${err}<input type="password" name="password" autofocus required placeholder="Password" style="width:100%;box-sizing:border-box;padding:12px 14px;border:1px solid rgba(0,0,0,.12);border-radius:10px;font-size:14px;margin-bottom:12px">
<button type="submit" style="width:100%;padding:12px;background:#E83A2E;color:#fff;border:0;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer">Unlock</button>
</form></body></html>`;
}
```

- [ ] **Step 5 — link-input.ts (test first)**

`src/lib/server/shortlinks/link-input.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { sanitizePhase2Fields } from './link-input';

const opts = { shortDomain: 'linkme.you', appHost: 'digione.ai' };

describe('sanitizePhase2Fields', () => {
  it('accepts and passes through valid urls + max_clicks', () => {
    const r = sanitizePhase2Fields({ ios_url: 'https://apps.apple.com/x', max_clicks: 100 }, opts);
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.fields.ios_url).toContain('apps.apple.com'); expect(r.fields.max_clicks).toBe(100); }
  });
  it('rejects an unsafe ios_url', () => {
    const r = sanitizePhase2Fields({ ios_url: 'javascript:alert(1)' }, opts);
    expect(r.ok).toBe(false);
  });
  it('builds a cleaned geo map and drops bad entries via error', () => {
    const good = sanitizePhase2Fields({ geo: { in: 'https://in.com', US: 'https://us.com' } }, opts);
    expect(good.ok).toBe(true);
    if (good.ok) expect(good.fields.geo).toEqual({ IN: 'https://in.com', US: 'https://us.com' });
    const bad = sanitizePhase2Fields({ geo: { US: 'not-a-url' } }, opts);
    expect(bad.ok).toBe(false);
  });
  it('clears fields on empty string / null', () => {
    const r = sanitizePhase2Fields({ ios_url: '', geo: {}, max_clicks: null, og_title: '' }, opts);
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.fields.ios_url).toBeNull(); expect(r.fields.geo).toBeNull(); expect(r.fields.max_clicks).toBeNull(); expect(r.fields.og_title).toBeNull(); }
  });
  it('rejects an invalid country code', () => {
    expect(sanitizePhase2Fields({ geo: { USA: 'https://x.com' } }, opts).ok).toBe(false);
  });
});
```

Implementation `src/lib/server/shortlinks/link-input.ts`:

```ts
// Validates + normalizes the Phase 2 link fields shared by the create and
// update routes. Password hashing is handled in the routes (needs the plaintext).

import { validateDestinationUrl } from './url-safety';

export interface Phase2Fields {
  ios_url: string | null;
  android_url: string | null;
  geo: Record<string, string> | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  max_clicks: number | null;
}

type Result =
  | { ok: true; fields: Partial<Phase2Fields> }
  | { ok: false; error: string };

interface Input {
  ios_url?: string | null;
  android_url?: string | null;
  geo?: Record<string, unknown> | null;
  og_title?: string | null;
  og_description?: string | null;
  og_image?: string | null;
  max_clicks?: number | string | null;
}

export function sanitizePhase2Fields(
  body: Input,
  opts: { shortDomain?: string; appHost?: string }
): Result {
  const fields: Partial<Phase2Fields> = {};

  for (const key of ['ios_url', 'android_url', 'og_image'] as const) {
    if (body[key] === undefined) continue;
    const raw = (body[key] ?? '').toString().trim();
    if (!raw) { fields[key] = null; continue; }
    const check = validateDestinationUrl(raw, opts);
    if (!check.ok) return { ok: false, error: `${key}: ${check.error}` };
    fields[key] = check.url!;
  }

  if (body.og_title !== undefined) fields.og_title = (body.og_title ?? '').trim().slice(0, 120) || null;
  if (body.og_description !== undefined) fields.og_description = (body.og_description ?? '').trim().slice(0, 200) || null;

  if (body.geo !== undefined) {
    if (!body.geo || typeof body.geo !== 'object' || Object.keys(body.geo).length === 0) {
      fields.geo = null;
    } else {
      const map: Record<string, string> = {};
      for (const [rawCc, rawUrl] of Object.entries(body.geo)) {
        const cc = rawCc.trim().toUpperCase();
        if (!/^[A-Z]{2}$/.test(cc)) return { ok: false, error: `Invalid country code: ${rawCc}` };
        const url = (rawUrl ?? '').toString().trim();
        const check = validateDestinationUrl(url, opts);
        if (!check.ok) return { ok: false, error: `geo ${cc}: ${check.error}` };
        map[cc] = check.url!;
      }
      fields.geo = map;
    }
  }

  if (body.max_clicks !== undefined) {
    if (body.max_clicks === null || body.max_clicks === '') {
      fields.max_clicks = null;
    } else {
      const n = Number(body.max_clicks);
      if (!Number.isInteger(n) || n < 1) return { ok: false, error: 'max_clicks must be a positive integer' };
      fields.max_clicks = n;
    }
  }

  return { ok: true, fields };
}
```

- [ ] **Step 6 — run each test to fail, implement, pass; then whole suite**

For each file: `npx vitest run <path>` fails (module missing) → implement → passes. Finally `npm test` → all suites green (Phase 1 + these 5 new).

- [ ] **Step 7: Commit**

```bash
git add src/lib/server/shortlinks/{password,targeting,crawler,html,link-input}.ts src/lib/server/shortlinks/{password,targeting,crawler,html,link-input}.test.ts
git commit -m "feat(short-links): phase 2 pure libs (password/targeting/crawler/html/input)"
```

---

## Task 3: Redirect route rewrite (GET + POST)

**Files:**
- Modify (full replace): `app/api/s/[code]/route.ts`

- [ ] **Step 1: Replace the route with the resolver**

Replace the entire contents of `app/api/s/[code]/route.ts` with:

```ts
// GET /api/s/[code] — resolves a short code and 302-redirects. proxy.ts rewrites
// {shortdomain}/{code} → here. Handles (in order): disabled/expired/max-clicks,
// social-crawler OG shell, password gate, geo/device targeting. POST verifies a
// password from the interstitial form. Tracking runs post-response via after().

import { NextResponse, after } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { normalizeCode } from '@/lib/server/shortlinks/code';
import { appendUtmParams } from '@/lib/server/shortlinks/redirect-url';
import { parseUserAgent, isBot } from '@/lib/server/shortlinks/ua';
import { dedupHash, hashIp } from '@/lib/server/shortlinks/dedup';
import { TtlCache } from '@/lib/server/shortlinks/cache';
import { pickDestination } from '@/lib/server/shortlinks/targeting';
import { isSocialCrawler } from '@/lib/server/shortlinks/crawler';
import { renderOgHtml, renderUnlockHtml } from '@/lib/server/shortlinks/html';
import { verifyPassword, unlockToken } from '@/lib/server/shortlinks/password';
import type { Database } from '@/types/database.types';

type LinkRow = Database['public']['Tables']['linksh_links']['Row'];

const resolveCache = new TtlCache<LinkRow | null>(30_000);
const appUrl = () => process.env.NEXT_PUBLIC_APP_URL || 'https://digione.ai';

function redirect(to: string) {
  return NextResponse.redirect(to, { status: 302, headers: { 'Cache-Control': 'no-store' } });
}
function html(body: string, status = 200) {
  return new NextResponse(body, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
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

// Approximate cap: click_count is denormalized + cache-lagged, so max_clicks may
// overshoot slightly. Acceptable for a soft limit.
function isDisabled(link: LinkRow, now: number): boolean {
  const expired = link.expires_at ? new Date(link.expires_at).getTime() < now : false;
  const capped = link.max_clicks != null && Number(link.click_count) >= Number(link.max_clicks);
  return !link.is_active || !!link.archived_at || expired || capped;
}

function readCookie(req: Request, name: string): string | null {
  const raw = req.headers.get('cookie');
  if (!raw) return null;
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

function ctxFromReq(req: Request) {
  const ua = req.headers.get('user-agent');
  const referrer = req.headers.get('referer') || req.headers.get('referrer') || null;
  const country = req.headers.get('x-vercel-ip-country') || req.headers.get('cf-ipcountry') || null;
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
  return { ua, referrer, country, ip };
}

function trackClick(link: LinkRow, finalUrl: string, now: number, ctx: ReturnType<typeof ctxFromReq>) {
  after(async () => {
    try {
      if (isBot(ctx.ua)) return;
      const ipH = hashIp(ctx.ip);
      const { deviceType, browser, os } = parseUserAgent(ctx.ua);
      const db = createServiceClient();
      await db.rpc('linksh_record_click', {
        p_link_id: link.id, p_creator_id: link.creator_id, p_ip_hash: ipH,
        p_country: ctx.country ?? '', p_device_type: deviceType, p_browser: browser, p_os: os,
        p_referrer_url: ctx.referrer ?? '', p_user_agent: ctx.ua ?? '',
        p_resolved_destination_url: finalUrl, p_dedup_hash: dedupHash(link.id, ipH, now),
      });
    } catch (err) {
      console.error('[api/s] tracking failed', err);
    }
  });
}

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await params;
  const code = normalizeCode(rawCode);
  const link = await resolve(code);
  if (!link) return redirect(appUrl());

  const now = Date.now();
  if (isDisabled(link, now)) return redirect(link.expired_redirect_url || appUrl());

  const ctx = ctxFromReq(req);
  const { os } = parseUserAgent(ctx.ua);

  // Social crawler → OG meta shell (public preview; no tracking, no gate).
  if (isSocialCrawler(ctx.ua) && (link.og_title || link.og_description || link.og_image)) {
    const preview = appendUtmParams(pickDestination(link, { country: ctx.country, os }), link);
    return html(renderOgHtml({ title: link.og_title, description: link.og_description, image: link.og_image, url: preview }));
  }

  // Password gate.
  if (link.password_hash) {
    const expected = unlockToken(code, link.password_hash);
    if (readCookie(req, `du_${code}`) !== expected) {
      return html(renderUnlockHtml({ action: `/api/s/${encodeURIComponent(code)}` }));
    }
  }

  const finalUrl = appendUtmParams(pickDestination(link, { country: ctx.country, os }), link);
  trackClick(link, finalUrl, now, ctx);
  return redirect(finalUrl);
}

// POST — the password interstitial form submits here.
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await params;
  const code = normalizeCode(rawCode);
  const link = await resolve(code);
  if (!link) return redirect(appUrl());

  const now = Date.now();
  if (isDisabled(link, now)) return redirect(link.expired_redirect_url || appUrl());
  if (!link.password_hash) return redirect(appUrl());

  const action = `/api/s/${encodeURIComponent(code)}`;
  const form = await req.formData().catch(() => null);
  const password = form?.get('password');
  if (typeof password !== 'string' || !verifyPassword(password, link.password_hash)) {
    return html(renderUnlockHtml({ action, error: true }), 401);
  }

  const ctx = ctxFromReq(req);
  const { os } = parseUserAgent(ctx.ua);
  const finalUrl = appendUtmParams(pickDestination(link, { country: ctx.country, os }), link);
  trackClick(link, finalUrl, now, ctx);

  const res = redirect(finalUrl);
  res.cookies.set(`du_${code}`, unlockToken(code, link.password_hash), {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 2,
  });
  return res;
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit` → PASS.
Run: `npx eslint "app/api/s/[code]/route.ts"` → 0 errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/s/[code]/route.ts
git commit -m "feat(short-links): resolver redirect — password, OG, geo/device targeting"
```

---

## Task 4: Write routes + hook types

**Files:**
- Modify: `app/api/links/route.ts` (POST create)
- Modify: `app/api/links/[id]/route.ts` (PATCH update)
- Modify: `src/hooks/marketing/useShortLinks.ts`

- [ ] **Step 1: Extend the create route**

In `app/api/links/route.ts`:

1. Add imports:
```ts
import { hashPassword } from '@/lib/server/shortlinks/password';
import { sanitizePhase2Fields } from '@/lib/server/shortlinks/link-input';
```
2. Extend the `CreateBody` interface with:
```ts
  password?: string;
  ios_url?: string;
  android_url?: string;
  geo?: Record<string, string>;
  og_title?: string;
  og_description?: string;
  og_image?: string;
  max_clicks?: number | null;
```
3. After the destination `urlCheck` passes and before the insert, sanitize the Phase 2 fields:
```ts
    const phase2 = sanitizePhase2Fields(body, {
      shortDomain: getShortlinkDomain(),
      appHost: appHostOf(process.env.NEXT_PUBLIC_APP_URL),
    });
    if (!phase2.ok) return NextResponse.json({ error: phase2.error }, { status: 400 });
```
4. Add these keys to the `.insert({ ... })` object (after `expired_redirect_url`):
```ts
      password_hash: body.password && body.password.trim() ? hashPassword(body.password) : null,
      ios_url: phase2.fields.ios_url ?? null,
      android_url: phase2.fields.android_url ?? null,
      geo: phase2.fields.geo ?? null,
      og_title: phase2.fields.og_title ?? null,
      og_description: phase2.fields.og_description ?? null,
      og_image: phase2.fields.og_image ?? null,
      max_clicks: phase2.fields.max_clicks ?? null,
```

- [ ] **Step 2: Extend the update route**

In `app/api/links/[id]/route.ts`:

1. Add imports (same two as above).
2. Extend `PatchBody` with the same fields as `CreateBody` in Step 1 (all optional).
3. In `PATCH`, after building the destination/code portion of `patch` and before the DB update, add:
```ts
    const phase2 = sanitizePhase2Fields(body, {
      shortDomain: getShortlinkDomain(),
      appHost: appHostOf(process.env.NEXT_PUBLIC_APP_URL),
    });
    if (!phase2.ok) return NextResponse.json({ error: phase2.error }, { status: 400 });
    Object.assign(patch, phase2.fields); // only keys the client sent are present

    // Password: undefined = leave unchanged; '' = clear; non-empty = re-hash.
    if (body.password !== undefined) {
      patch.password_hash = body.password.trim() ? hashPassword(body.password) : null;
    }
```
   (You'll need `getShortlinkDomain` + `appHostOf` in this file — `getShortlinkDomain` is already imported; add the small `appHostOf` helper identical to the create route if not present.)

- [ ] **Step 3: Extend the hook input types**

In `src/hooks/marketing/useShortLinks.ts`, add to `CreateLinkInput`:
```ts
  password?: string;
  ios_url?: string | null;
  android_url?: string | null;
  geo?: Record<string, string> | null;
  og_title?: string | null;
  og_description?: string | null;
  og_image?: string | null;
  max_clicks?: number | null;
```
(`UpdateLinkInput` already extends `Partial<CreateLinkInput>`, so it inherits them. `ShortLink` picks up the new columns automatically from the regenerated `Database` types.)

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit` → PASS.
Run: `npx eslint app/api/links src/hooks/marketing/useShortLinks.ts` → 0 errors.

- [ ] **Step 5: Commit**

```bash
git add app/api/links/route.ts app/api/links/[id]/route.ts src/hooks/marketing/useShortLinks.ts
git commit -m "feat(short-links): persist phase 2 fields via create/update routes + hook"
```

---

## Task 5: Drawer UI + card indicator

**Files:**
- Modify: `src/components/dashboard/links/LinkFormDrawer.tsx`
- Modify: `src/components/dashboard/links/LinkCard.tsx`

Follow the DigiOne dashboard design system (`.claude/rules/dashboard-design.md`): CSS-var tokens only, lucide-react icons, `focus-visible:shadow-[var(--focus-ring)]` on every interactive element, compact sizing. Reuse the existing `INPUT` and `LABEL` consts already defined in the drawer, and the existing collapsible-section pattern (the `showUtm`/`showExpiry` chevron buttons).

- [ ] **Step 1: Add Phase 2 state to the drawer**

Add local state near the existing `useState`s:
```tsx
  const [password, setPassword] = useState('');
  const [iosUrl, setIosUrl] = useState('');
  const [androidUrl, setAndroidUrl] = useState('');
  const [geoRows, setGeoRows] = useState<Array<{ cc: string; url: string }>>([]);
  const [og, setOg] = useState({ title: '', description: '', image: '' });
  const [maxClicks, setMaxClicks] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
```
In the `useEffect` that resets from `editing`/open, initialize them (leave `password` blank always — never prefilled):
```tsx
      setPassword('');
      setIosUrl(editing?.ios_url ?? '');
      setAndroidUrl(editing?.android_url ?? '');
      setGeoRows(editing?.geo && typeof editing.geo === 'object'
        ? Object.entries(editing.geo as Record<string, string>).map(([cc, url]) => ({ cc, url }))
        : []);
      setOg({ title: editing?.og_title ?? '', description: editing?.og_description ?? '', image: editing?.og_image ?? '' });
      setMaxClicks(editing?.max_clicks != null ? String(editing.max_clicks) : '');
```
And in the non-editing (create) branch, reset all to empty (`''` / `[]`).

- [ ] **Step 2: Include Phase 2 fields in the submit payload**

In `submit()`, extend the `payload` object with:
```tsx
        password: password.trim() ? password : (editing ? undefined : undefined),
        ios_url: iosUrl.trim() || null,
        android_url: androidUrl.trim() || null,
        geo: geoRows.reduce((acc, r) => {
          const cc = r.cc.trim().toUpperCase();
          if (cc && r.url.trim()) acc[cc] = r.url.trim();
          return acc;
        }, {} as Record<string, string>),
        og_title: og.title.trim() || null,
        og_description: og.description.trim() || null,
        og_image: og.image.trim() || null,
        max_clicks: maxClicks.trim() ? Number(maxClicks) : null,
```
Note: send `password` only when non-empty (so editing without changing it leaves the hash intact; the route treats `undefined` as "unchanged"). Simplify the password line to:
```tsx
        ...(password.trim() ? { password } : {}),
```

- [ ] **Step 3: Render a single "Advanced" collapsible section**

After the existing Expiration section, add one more chevron toggle + body (reuse the exact pattern of the UTM/Expiration buttons), containing, in order:

- **Password** — one `type="password"` input bound to `password`, helper text (when `editing?.password_hash`): "This link is password-protected. Leave blank to keep the current password; type a new one to change it." (when not): "Require a password before redirecting."
- **Device targeting** — two `INPUT`s: iOS URL (`iosUrl`), Android URL (`androidUrl`), each with a small `LABEL`.
- **Geo targeting** — a repeater: for each `geoRows` entry a row with a small country-code input (`maxLength={2}`, uppercased) + a URL `INPUT` + a remove button (`X` icon); an "+ Add country" button appends `{ cc:'', url:'' }`.
- **Social preview (OG)** — three `INPUT`s: `og.title`, `og.description`, `og.image` (image is a URL).
- **Limits** — one number `INPUT` bound to `maxClicks` (`type="number"`, `min={1}`), label "Max clicks", helper "Link stops working after this many clicks."

All inputs use the existing `INPUT` const; labels use `LABEL`; the remove/add buttons carry focus rings and use tokens (`text-[var(--text-tertiary)]`, `hover:text-[var(--danger)]` for remove).

- [ ] **Step 4: Add a "protected" indicator to the link card**

In `src/components/dashboard/links/LinkCard.tsx`, import `Lock` from lucide-react and, next to the short URL (after the copy/QR buttons or near the status pill), render a small lock icon when the link is protected:
```tsx
{link.password_hash ? <Lock className="w-3.5 h-3.5 text-[var(--text-tertiary)]" aria-label="Password protected" /> : null}
```
(Optional, keep it subtle — one icon, tokened.)

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit` → PASS.
Run: `npx eslint src/components/dashboard/links` → 0 errors.
Run (color grep): `grep -nE "bg-(white|gray|zinc|emerald|red|amber|blue|indigo)|text-(gray|zinc|emerald|red|amber|blue)|border-(gray|zinc|emerald)|dark:" src/components/dashboard/links` → only the known `bg-white` QR wells.

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard/links/LinkFormDrawer.tsx src/components/dashboard/links/LinkCard.tsx
git commit -m "feat(short-links): phase 2 drawer fields + protected-link indicator"
```

---

## Task 6: Docs + full verification

**Files:**
- Modify: `.claude/rules/api-routes.md`
- Modify: `docs/reference/dashboard-map.md`

- [ ] **Step 1: Update `api-routes.md`**

Update the `/api/s/[code]` row (and add a POST) to reflect the resolver behavior:
```
| GET/POST | `/api/s/[code]` | none (public) | service role | — (redirect resolver: max-clicks/expiry gate, social-crawler OG shell, password interstitial + POST verify w/ unlock cookie, geo→device→default targeting; writes `linksh_click_events` + counters via `linksh_record_click`, post-response) |
```

- [ ] **Step 2: Update `docs/reference/dashboard-map.md`**

Extend the `/dashboard/links` row's description to note the Phase 2 create/edit fields: "Advanced drawer section adds password protection, iOS/Android + geo targeting, custom OG preview, and max-click limits."

- [ ] **Step 3: Full gauntlet**

Run: `npx tsc --noEmit` → PASS.
Run: `npm run lint` → no NEW errors on any short-link file.
Run: `npm test` → PASS (Phase 1 + 5 new Phase 2 lib suites).

- [ ] **Step 4: Commit**

```bash
git add .claude/rules/api-routes.md docs/reference/dashboard-map.md
git commit -m "docs(short-links): document phase 2 resolver + drawer fields"
```

---

## Done criteria

- Migration applied; 8 new columns on `linksh_links`; types regenerated.
- 5 new pure libs, each unit-tested; `npm test` green.
- Redirect route resolves password / OG / geo / device / max-clicks in the locked precedence order; password POST sets an unforgeable unlock cookie.
- Create/edit routes validate + persist all new fields; passwords hashed server-side (scrypt), never returned as plaintext.
- Drawer exposes all five features under an Advanced section; card shows a protected indicator.
- `npx tsc --noEmit`, `npm run lint` (no new errors), `npm test` all pass.

## Out of scope (as agreed)

Per-creator branded domains (needs a full custom-domain/DNS/cert system) and all of Phase 3 (click→order revenue attribution — touches the money path).
