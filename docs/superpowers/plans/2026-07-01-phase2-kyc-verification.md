---
noteId: "f37a97a0750511f193a7f790bf9449ed"
tags: []

---

# Phase 2 — KYC Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let creators upload KYC documents (PAN card, bank proof, optional Aadhaar) to the private R2 bucket, and let a super_admin review + verify/reject a creator's KYC from the terminal — which unblocks the Phase 1 payout flow.

**Architecture:** No admin UI in this app (admin moves to a separate app later — `.claude/todo-later/12(left)-…`). Creator-facing doc upload reuses the existing `/api/upload` + `/api/upload/confirm` private-file flow, linked to a new `kyc_documents` table via `POST /api/kyc/documents`. Admin verify/reject is a terminal script (`scripts/kyc-admin.ts`) built on a provider-ready `kyc-verify.ts` lib, run with the service-role key.

**Tech Stack:** Next.js 16 route handlers, Supabase (service-role + RLS), R2 storage lib (`@/lib/storage`), `npx tsx` for the script, Vitest. Supabase MCP for migration + type regen.

**Spec:** `docs/superpowers/specs/2026-07-01-phase2-kyc-verification-design.md`
**Conventions:** commit to `main`. Project id `qcendfisvyjnwmefruba`. Admin role = re-read `users.role='super_admin'` (JWT-null under service role). All credential-independent — builds end-to-end.

---

## Grounded facts (verified live/code 2026-07-01)

- `creator_kyc` verification columns already exist: `status, pan_verified, pan_verified_at, pan_verification_provider, pan_verification_ref, bank_verified, bank_verified_at, bank_verification_provider, bank_verification_ref, upi_verified, upi_verified_at, upi_verification_provider, upi_verification_ref, verification_provider, rejection_reason, admin_notes`. **0 verified.** `_enc` cols are text.
- Storage: `resolveBucket('creator-private')` → `{ name }`; `storage.createDownloadUrl({ bucket, objectKey, ttlSeconds })` (from `@/lib/storage`); KYC docs are `storage_files` rows with `kind='kyc'`, `owner_id=<profileId>`, `bucket=<creator-private name>`, `deleted_at IS NULL`.
- `kyc_access_log` cols: `admin_id, creator_id, file_id, object_key` (+ id/created_at defaults).
- `/api/upload` body: `{ filename, bucket:'creator-private', kind:'kyc', category:'kyc' }` → `{ uploadUrl, bucket, objectKey }`. Then client PUTs the file to `uploadUrl`. `/api/upload/confirm` body `{ bucket, objectKey, kind:'kyc' }` → `{ fileId }`.
- `resolveProfileId(user.id, user.email)` → `profiles.id`. `createServiceClient()` from `@/lib/supabase/service`; `createClient()` (cookie) from `@/lib/supabase/server`. `isUuid` from `@/lib/upload-validators`.
- Billing wizard: `app/dashboard/settings/billing/page.tsx` — `STEP_LABELS = ['Identity','Address','Bank','Review']`, a `Stepper`, per-step validation (`v1`,`v3`), `useEarnings().kyc`. `_enc` never rehydrated into inputs.

---

## File structure

| File | Responsibility | Status |
|---|---|---|
| `supabase/migrations/20260701000003_kyc_documents.sql` | `kyc_documents` table + RLS | create |
| `src/lib/server/kyc-verify.ts` (+`.test.ts`) | `buildVerifyPatch` (pure) + `verifyKyc`/`rejectKyc` | create |
| `app/api/kyc/documents/route.ts` | link an uploaded file → `kyc_documents` | create |
| `scripts/kyc-admin.ts` | terminal `view`/`verify`/`reject` | create |
| `src/hooks/creator/useKycDocuments.ts` | upload + list creator KYC docs | create |
| `app/dashboard/settings/billing/page.tsx` | new "Documents" wizard step | modify |
| `types/database.types.ts` | regen (kyc_documents) | regenerate |
| `.claude/rules/api-routes.md`, `docs/reference/dashboard-map.md`, `.claude/rules/supabase-reference.md`, blueprint | docs | modify |

---

## Task 1: Migration — `kyc_documents` table + RLS

**Files:** Create `supabase/migrations/20260701000003_kyc_documents.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Phase 2 — kyc_documents (2026-07-01)
-- Spec: docs/superpowers/specs/2026-07-01-phase2-kyc-verification-design.md
-- Links an uploaded storage_files object (kind='kyc', bucket=creator-private) to a creator's KYC,
-- tagged by doc_type. Creator inserts/reads own; super_admin reads all; no client UPDATE/DELETE.
create table if not exists public.kyc_documents (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  file_id uuid not null references public.storage_files(id) on delete cascade,
  doc_type text not null check (doc_type in ('pan_card','bank_proof','aadhaar')),
  created_at timestamptz not null default now()
);
create index if not exists idx_kyc_documents_creator on public.kyc_documents(creator_id);

alter table public.kyc_documents enable row level security;
drop policy if exists kyc_documents_select_own on public.kyc_documents;
create policy kyc_documents_select_own on public.kyc_documents
  for select to authenticated using (creator_id = public.current_profile_id() or (select public.is_super_admin()));
drop policy if exists kyc_documents_insert_own on public.kyc_documents;
create policy kyc_documents_insert_own on public.kyc_documents
  for insert to authenticated with check (creator_id = public.current_profile_id());
```

- [ ] **Step 2: Apply via MCP + verify**

Call `mcp__plugin_supabase_supabase__apply_migration` (`project_id: qcendfisvyjnwmefruba`, `name: kyc_documents`, `query`: the file contents). Then `execute_sql`:
```sql
select
  exists(select 1 from information_schema.tables where table_schema='public' and table_name='kyc_documents') as tbl,
  (select string_agg(policyname||':'||cmd, ', ') from pg_policies where schemaname='public' and tablename='kyc_documents') as policies;
```
Expected: `tbl=true`, policies include `kyc_documents_select_own:SELECT` + `kyc_documents_insert_own:INSERT`.

- [ ] **Step 3: Commit**
```bash
git add supabase/migrations/20260701000003_kyc_documents.sql
git commit -m "feat(db): kyc_documents table + RLS (creator own, super_admin read)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Regenerate types

**Files:** Regenerate `types/database.types.ts`

- [ ] **Step 1: Generate + write (MCP fallback)**

Call `mcp__plugin_supabase_supabase__generate_typescript_types` (`project_id: qcendfisvyjnwmefruba`); output saves to a tool-results `.txt`. Extract with Node:
```
node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));fs.writeFileSync('types/database.types.ts',p.types,'utf8');console.log('wrote '+p.types.length)" "<tool-results-path>"
```

- [ ] **Step 2: Verify + commit**

Run: `git grep -n "kyc_documents" types/database.types.ts` → expect hits. Run: `npx tsc --noEmit` → clean.
```bash
git add types/database.types.ts
git commit -m "chore(types): regenerate after kyc_documents migration

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: `kyc-verify.ts` lib (TDD)

**Files:** Create `src/lib/server/kyc-verify.ts`, Test `src/lib/server/kyc-verify.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/server/kyc-verify.test.ts
import { describe, it, expect } from 'vitest';
import { buildVerifyPatch } from './kyc-verify';

const NOW = '2026-07-01T00:00:00.000Z';

describe('buildVerifyPatch', () => {
  it('verifies pan + bank (+ upi when present) with the provider stamped', () => {
    const p = buildVerifyPatch('manual', true, NOW);
    expect(p.status).toBe('verified');
    expect(p.verification_provider).toBe('manual');
    expect(p.pan_verified).toBe(true);
    expect(p.bank_verified).toBe(true);
    expect(p.upi_verified).toBe(true);
    expect(p.pan_verified_at).toBe(NOW);
    expect(p.pan_verification_provider).toBe('manual');
    expect(p.rejection_reason).toBeNull();
  });

  it('leaves upi unverified when the creator has no UPI', () => {
    const p = buildVerifyPatch('manual', false, NOW);
    expect(p.upi_verified).toBe(false);
    expect(p.upi_verified_at).toBeNull();
    expect(p.upi_verification_provider).toBeNull();
  });

  it('propagates a non-manual provider (provider-ready)', () => {
    const p = buildVerifyPatch('cashfree', true, NOW);
    expect(p.verification_provider).toBe('cashfree');
    expect(p.bank_verification_provider).toBe('cashfree');
  });
});
```

- [ ] **Step 2: Run it, verify FAIL**

Run: `npm test -- src/lib/server/kyc-verify.test.ts` → FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
// src/lib/server/kyc-verify.ts
// Provider-ready KYC verify/reject. Server-only (writes via the service client). buildVerifyPatch is
// pure + testable; verifyKyc/rejectKyc apply it. provider='manual' now; a real PAN/bank verification
// API later calls verifyKyc with provider='cashfree'|'signzy' (+ optional per-field *_verification_ref).
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

export function buildVerifyPatch(provider: string, hasUpi: boolean, now: string): Record<string, unknown> {
  return {
    status: 'verified',
    verification_provider: provider,
    pan_verified: true,  pan_verified_at: now,  pan_verification_provider: provider,
    bank_verified: true, bank_verified_at: now, bank_verification_provider: provider,
    upi_verified: hasUpi, upi_verified_at: hasUpi ? now : null, upi_verification_provider: hasUpi ? provider : null,
    rejection_reason: null,
  };
}

type Db = SupabaseClient<Database>;

export async function verifyKyc(db: Db, creatorId: string, opts?: { provider?: string }): Promise<boolean> {
  const provider = opts?.provider ?? 'manual';
  const { data: kyc } = await db.from('creator_kyc').select('upi_id_enc').eq('creator_id', creatorId).maybeSingle();
  if (!kyc) return false;
  const hasUpi = !!(kyc.upi_id_enc && String(kyc.upi_id_enc).length > 0);
  const patch = buildVerifyPatch(provider, hasUpi, new Date().toISOString());
  const { error } = await db.from('creator_kyc').update(patch).eq('creator_id', creatorId);
  if (error) throw error;
  return true;
}

export async function rejectKyc(db: Db, creatorId: string, reason: string): Promise<boolean> {
  const { data: existing } = await db.from('creator_kyc').select('creator_id').eq('creator_id', creatorId).maybeSingle();
  if (!existing) return false;
  const { error } = await db.from('creator_kyc').update({ status: 'rejected', rejection_reason: reason }).eq('creator_id', creatorId);
  if (error) throw error;
  return true;
}
```

- [ ] **Step 4: Run it, verify PASS + typecheck**

Run: `npm test -- src/lib/server/kyc-verify.test.ts` → PASS (3). Run: `npx tsc --noEmit` → clean. (If the `update(patch)` with a loose `Record` fails tsc, cast the patch: `.update(patch as never)` is NOT allowed — instead type `buildVerifyPatch`'s return as `Database['public']['Tables']['creator_kyc']['Update']` and build it typed. If needed, change the return type to that Update type and re-run.)

- [ ] **Step 5: Commit**
```bash
git add src/lib/server/kyc-verify.ts src/lib/server/kyc-verify.test.ts
git commit -m "feat(kyc): provider-ready verifyKyc/rejectKyc + pure buildVerifyPatch (TDD)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: `POST /api/kyc/documents` — link an uploaded file

**Files:** Create `app/api/kyc/documents/route.ts`, Modify `.claude/rules/api-routes.md`

- [ ] **Step 1: Write the route**

```ts
// app/api/kyc/documents/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveProfileId } from '@/lib/server/resolve-profile';
import { resolveBucket } from '@/lib/storage';
import { isUuid } from '@/lib/upload-validators';

const DOC_TYPES = ['pan_card', 'bank_proof', 'aadhaar'];

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const fileId = (body as { fileId?: string }).fileId;
    const docType = (body as { docType?: string }).docType;
    if (!fileId || !isUuid(fileId) || !docType || !DOC_TYPES.includes(docType)) {
      return NextResponse.json({ error: 'fileId (uuid) and a valid docType are required.' }, { status: 400 });
    }

    const profileId = await resolveProfileId(user.id, user.email);
    if (!profileId) return NextResponse.json({ error: 'Creator profile not found.' }, { status: 404 });

    const db = createServiceClient();
    // The file must be this creator's KYC object in the private bucket.
    const cfg = resolveBucket('creator-private');
    const { data: file } = await db.from('storage_files')
      .select('id, owner_id, bucket, kind').eq('id', fileId).maybeSingle();
    if (!file || file.owner_id !== profileId || file.bucket !== cfg.name || file.kind !== 'kyc') {
      return NextResponse.json({ error: 'File not found or not an owned KYC document.' }, { status: 403 });
    }

    const { data: doc, error } = await db.from('kyc_documents')
      .insert({ creator_id: profileId, file_id: fileId, doc_type: docType })
      .select('id').single();
    if (error) {
      console.error('[kyc/documents] insert failed', error.message);
      return NextResponse.json({ error: 'Failed to link document.' }, { status: 500 });
    }
    return NextResponse.json({ ok: true, documentId: doc.id });
  } catch (e) {
    console.error('[kyc/documents] error', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Typecheck + document + commit**

Run: `npx tsc --noEmit` → clean. Add a row to `.claude/rules/api-routes.md` "At a glance": `POST /api/kyc/documents | cookie session | server + service role | kyc_documents (links an uploaded creator-private kyc file)`.
```bash
git add app/api/kyc/documents/route.ts .claude/rules/api-routes.md
git commit -m "feat(kyc): POST /api/kyc/documents — link uploaded private file to kyc_documents

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: `scripts/kyc-admin.ts` — terminal view/verify/reject

**Files:** Create `scripts/kyc-admin.ts`

- [ ] **Step 1: Write the script**

```ts
// scripts/kyc-admin.ts
// Terminal admin for KYC (interim until the separate admin app exists). Service-role — the runner
// holds SUPABASE_SERVICE_KEY (= the trusted admin). Run:
//   npx tsx --env-file=.env.local scripts/kyc-admin.ts view   <creatorId> [--admin <profileId>]
//   npx tsx --env-file=.env.local scripts/kyc-admin.ts verify <creatorId> [--provider manual] [--admin <profileId>]
//   npx tsx --env-file=.env.local scripts/kyc-admin.ts reject <creatorId> "<reason>"
import { createServiceClient } from '../src/lib/supabase/service';
import { resolveBucket, storage } from '../src/lib/storage';
import { verifyKyc, rejectKyc } from '../src/lib/server/kyc-verify';

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const [cmd, creatorId] = process.argv.slice(2);
  if (!cmd || !creatorId) throw new Error('usage: kyc-admin <view|verify|reject> <creatorId> [...]');
  const db = createServiceClient();

  if (cmd === 'view') {
    const { data: kyc } = await db.from('creator_kyc')
      .select('status, legal_name, pan_last4, bank_last4, ifsc_code, upi_verified, city, state, verification_provider, rejection_reason')
      .eq('creator_id', creatorId).maybeSingle();
    console.log('KYC:', kyc ?? '(none)');

    const cfg = resolveBucket('creator-private');
    const { data: files } = await db.from('storage_files')
      .select('id, object_key, file_name, mime_type').eq('owner_id', creatorId).eq('bucket', cfg.name)
      .eq('kind', 'kyc').is('deleted_at', null).order('created_at', { ascending: false });
    const { data: docs } = await db.from('kyc_documents').select('file_id, doc_type').eq('creator_id', creatorId);
    const typeByFile = new Map((docs ?? []).map(d => [d.file_id, d.doc_type]));
    const adminId = arg('--admin') ?? 'terminal';
    for (const f of files ?? []) {
      const signedUrl = await storage.createDownloadUrl({ bucket: cfg.name, objectKey: f.object_key, ttlSeconds: 600 });
      await db.from('kyc_access_log').insert({ admin_id: adminId, creator_id: creatorId, file_id: f.id, object_key: f.object_key });
      console.log(`\n[${typeByFile.get(f.id) ?? 'kyc'}] ${f.file_name} (${f.mime_type})\n  ${signedUrl}`);
    }
    if (!files?.length) console.log('(no documents uploaded)');
  } else if (cmd === 'verify') {
    const ok = await verifyKyc(db, creatorId, { provider: arg('--provider') ?? 'manual' });
    console.log(ok ? `verified ${creatorId}` : `no KYC row for ${creatorId}`);
  } else if (cmd === 'reject') {
    const reason = process.argv[4] ?? 'Rejected by admin';
    const ok = await rejectKyc(db, creatorId, reason);
    console.log(ok ? `rejected ${creatorId}: ${reason}` : `no KYC row for ${creatorId}`);
  } else {
    throw new Error(`unknown command: ${cmd}`);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error('kyc-admin FAILED:', e.message); process.exit(1); });
```

- [ ] **Step 2: Typecheck + commit (do NOT run against real data yet)**

Run: `npx tsc --noEmit` → clean. (Running it live is part of Task 7's manual verification.)
```bash
git add scripts/kyc-admin.ts
git commit -m "feat(kyc): terminal kyc-admin script — view/verify/reject (service-role)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Documents wizard step (hook + UI)

**Files:** Create `src/hooks/creator/useKycDocuments.ts`, Modify `app/dashboard/settings/billing/page.tsx`

- [ ] **Step 1: Create the hook**

```ts
// src/hooks/creator/useKycDocuments.ts
'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { getCreatorProfileId } from '@/lib/getCreatorProfileId';

export type KycDocType = 'pan_card' | 'bank_proof' | 'aadhaar';

export function useKycDocuments() {
  const qc = useQueryClient();
  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['kyc', 'documents'],
    queryFn: async () => {
      const creatorId = await getCreatorProfileId();
      const { data, error } = await supabase
        .from('kyc_documents')
        .select('id, doc_type, file_id, created_at, storage_files(file_name)')
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const upload = useMutation({
    mutationFn: async ({ file, docType }: { file: File; docType: KycDocType }) => {
      // 1. presign
      const up = await fetch('/api/upload', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, bucket: 'creator-private', kind: 'kyc', category: 'kyc' }),
      });
      const upData = await up.json();
      if (!up.ok) throw new Error(upData.error ?? 'Upload init failed');
      // 2. PUT bytes to R2
      const put = await fetch(upData.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type || 'application/octet-stream' } });
      if (!put.ok) throw new Error('File upload failed');
      // 3. confirm -> storage_files row
      const cf = await fetch('/api/upload/confirm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bucket: 'creator-private', objectKey: upData.objectKey, kind: 'kyc' }),
      });
      const cfData = await cf.json();
      if (!cf.ok) throw new Error(cfData.error ?? 'Confirm failed');
      // 4. link -> kyc_documents
      const link = await fetch('/api/kyc/documents', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: cfData.fileId, docType }),
      });
      const linkData = await link.json();
      if (!link.ok) throw new Error(linkData.error ?? 'Link failed');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kyc', 'documents'] }),
  });

  const latestByType = (t: KycDocType) => docs.find(d => d.doc_type === t);
  return { docs, latestByType, isLoading, uploadDoc: upload.mutateAsync, isUploading: upload.isPending };
}
```

- [ ] **Step 2: Add the "Documents" step to the wizard**

In `app/dashboard/settings/billing/page.tsx`:
- Add `'Documents'` to `STEP_LABELS` between `'Bank'` and `'Review'`: `['Identity','Address','Bank','Documents','Review']`. This shifts Review to step 5 — update any hardcoded `step === 4` for Review to `step === 5`, and the final-step check (`step < STEP_LABELS.length` already handles the count generically; the Submit button shows on the last step via `step === STEP_LABELS.length`).
- Import `import { useKycDocuments, type KycDocType } from '@/hooks/creator/useKycDocuments';` and call it in the component.
- Render step 4 (Documents) with three slots (PAN card*, Bank proof*, Aadhaar optional). Each slot: if `latestByType(type)` exists → show `✓ {file_name}` + a Replace `<input type=file>`; else an upload `<input type=file>` calling `uploadDoc({ file, docType: type })`. Show `isUploading` state + inline error. Use only design tokens + the existing `Field`/`StepHeader` primitives already in the file.
- **Gate:** add `const vDocs = !!latestByType('pan_card') && !!latestByType('bank_proof');` and require it before Continue on the Documents step (mirror the `stepValid` pattern: `stepValid(4)` returns `vDocs`). On the Review step, add PAN-card + bank-proof to the "missing" checks so Submit is blocked until both are uploaded.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit` → clean. Run: `npx eslint app/dashboard/settings/billing/page.tsx src/hooks/creator/useKycDocuments.ts` → no new errors. Run the dashboard hardcoded-color grep on the billing page → expect 0 hits.

- [ ] **Step 4: Manual UI check**

`npm run dev`, open `/dashboard/settings/billing` (as a creator whose KYC is not locked — a fresh/rejected row; if the row is `pending`/`verified` the wizard shows the read-only summary, so temporarily set it to `rejected` via `scripts/kyc-admin.ts reject <id> "test"` to see the wizard). Upload a PAN card + cheque in the Documents step; confirm Continue unlocks and the files show `✓`.

- [ ] **Step 5: Commit**
```bash
git add src/hooks/creator/useKycDocuments.ts app/dashboard/settings/billing/page.tsx
git commit -m "feat(kyc): Documents wizard step — upload PAN/bank/Aadhaar to private R2

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: End-to-end terminal verify + docs + final verify

**Files:** Modify `docs/reference/dashboard-map.md`, `.claude/rules/supabase-reference.md`, `.claude/todo-later/11(half)-…overhaul.md`

- [ ] **Step 1: Terminal e2e (manual)**

With a creator who has submitted KYC + uploaded docs:
```
npx tsx --env-file=.env.local scripts/kyc-admin.ts view <creatorId>
```
Expected: prints masked KYC + signed URLs (open one to confirm it downloads); a `kyc_access_log` row is written per doc (verify via MCP `select count(*) from kyc_access_log where creator_id='<id>'`). Then:
```
npx tsx --env-file=.env.local scripts/kyc-admin.ts verify <creatorId>
```
Expected: `verified <creatorId>`. Confirm via MCP: `select status, pan_verified, bank_verified, verification_provider from creator_kyc where creator_id='<id>'` → `verified/true/true/manual`. Confirm a Phase 1 withdraw request now passes the KYC gate (POST `/api/payouts/request` no longer 403s on KYC). Then test reject on a second creator.

- [ ] **Step 2: Docs**

- `docs/reference/dashboard-map.md`: update the `/dashboard/settings/billing` row to note the 5-step wizard (adds Documents) + `useKycDocuments` + `POST /api/kyc/documents`.
- `.claude/rules/supabase-reference.md`: add `kyc_documents` to the storage/KYC notes (RLS: creator own + super_admin read).
- `.claude/todo-later/11(half)-…overhaul.md`: mark Phase 2 in §0 → "BUILT (terminal-admin interim; admin UI → separate app plan 12(left))"; link the Phase 2 spec/plan; note provider auto-verify + admin-app migration are the carry-forwards.

- [ ] **Step 3: Full gauntlet + commit**

Run: `npx tsc --noEmit` · `npm run lint` · `npm test` · `/verify` → all green (kyc-verify tests included).
```bash
git add docs/reference/dashboard-map.md .claude/rules/supabase-reference.md ".claude/todo-later/11(half)-2026-06-30-payments-earnings-payout-kyc-overhaul.md"
git commit -m "docs(phase2): kyc_documents + Documents wizard + terminal verify; blueprint state

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Verification checklist (Phase 2 done when)

- [ ] A creator can upload PAN card + cheque (+ optional Aadhaar) in the Documents step; Continue/Submit gated on the two required docs.
- [ ] `kyc_documents` RLS: creator sees own, not others'; super_admin sees all.
- [ ] `kyc-admin.ts view` prints masked KYC + signed doc URLs and logs `kyc_access_log`.
- [ ] `kyc-admin.ts verify` sets `status='verified'` + `*_verified` + `verification_provider='manual'`; `reject` sets `status='rejected'` + reason.
- [ ] A verified creator passes the Phase 1 `/api/payouts/request` KYC gate.
- [ ] No admin UI was added to this app. `npx tsc --noEmit`, `npm run lint`, `npm test`, `/verify` pass.

## Self-review notes (addressed)

- **Spec coverage:** §2 schema → Task 1. §3.1 doc upload (route + hook + wizard step) → Tasks 4/6. §3.2 terminal script + `kyc-verify` lib → Tasks 3/5. §3.3 unblock payout → Task 7 Step 1. §4 security → route ownership guard (Task 4), RLS (Task 1), no admin UI, `kyc_access_log` logging (Task 5). §5 testing → Task 3 unit + Tasks 6/7 manual. §6 files all have tasks.
- **Type consistency:** `buildVerifyPatch(provider, hasUpi, now)` / `verifyKyc(db, creatorId, {provider})` / `rejectKyc(db, creatorId, reason)` identical across Tasks 3/5; `KycDocType` + `docType` values (`pan_card`/`bank_proof`/`aadhaar`) identical across Tasks 1/4/6; the upload→confirm→link chain matches the grounded `/api/upload` contract.
- **No placeholders:** every code step is complete; the wizard step (Task 6 Step 2) gives exact `STEP_LABELS`, the gate vars, and the slot behavior against the file's existing primitives.
