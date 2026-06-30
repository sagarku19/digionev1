---
noteId: "499b1e50745911f193a7f790bf9449ed"
tags: []

---

# Phase 0 — Money-path Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the two live KYC security holes (self-verify gate bypass + plaintext PAN/bank) and make payout completion accounting-correct, shipping the half-built Phase 0 as one coherent, non-bricking change-set.

**Architecture:** Two units. **Unit A (KYC hardening):** route all `creator_kyc` writes through a new service-role `POST /api/kyc/submit` that encrypts PII and forces `status='pending'`, then lock down client RLS writes. **Unit B (payout/balance accounting):** add `frozen_balance`, align payout status vocab, ship a corrected atomic `settle_payout()` RPC + an alert-only reconciliation function, and unify the available-balance formula across server route and client hook. Strict apply order (code before the lockdown migration) guarantees KYC submission never breaks mid-rollout.

**Tech Stack:** Next.js 16 route handlers, Supabase (Postgres + RLS, service-role client), Node `crypto` (AES-256-GCM), Vitest, Supabase MCP for migration apply + type regen (Windows CLI is broken).

**Spec:** `docs/superpowers/specs/2026-06-30-phase0-money-hardening-design.md`
**Project conventions:** commits go directly to `main` (no feature branch). Supabase project id `qcendfisvyjnwmefruba`. Type regen uses the MCP fallback in `.claude/rules/supabase-reference.md`.

---

## Grounded facts this plan relies on (verified live 2026-06-30)

- `transaction_ledger.record_hash` is **`bytea`**; `fulfillment.ts` writes `sha256(...).digest('hex')` (stored as its 64 ASCII bytes). `direction` is enum `('credit','debit')`. There is a dedicated `payout_id` column; `prev_hash`/`balance_after` are unused (no hash-chain).
- `credit_creator_balance` is **balance-only**; the ledger row is written separately in app code.
- `creator_kyc`: 1 row, `status='pending'`, **plaintext PAN + bank**, 0 verified. Write policies are named `creator_kyc_insert_own` / `creator_kyc_update_own`.
- `creator_payouts`: 0 rows; status CHECK = `('pending','initiated','processed','failed')`.
- `creator_balances`: 2 rows, no negatives; `frozen_balance` absent. `pg_cron` not installed.

---

## File structure

| File | Responsibility | Status |
|---|---|---|
| `src/lib/server/kyc-crypto.ts` (+`.test.ts`) | AES-256-GCM encrypt/decrypt/last4 | exists, keep |
| `src/lib/shared/balance.ts` (+`.test.ts`) | `availableBalance()` single source of truth | exists, keep |
| `src/lib/server/kyc-row.ts` (+`.test.ts`) | **NEW** pure `buildEncryptedKycRow()` — allowlist + force pending + encrypt | create |
| `app/api/kyc/submit/route.ts` | **NEW** service-role KYC writer | create |
| `scripts/backfill-encrypt-kyc.ts` | **NEW** one-off encrypt-in-place of existing plaintext rows | create |
| `supabase/migrations/20260630000000_phase0_money_hardening.sql` | lockdown + frozen + status + corrected `settle_payout` + reconcile | rewrite |
| `src/hooks/commerce/useEarnings.ts` | `updateKyc` → route; read → `availableBalance` | modify |
| `app/dashboard/settings/billing/page.tsx` | raw field state; submit to route; show `*_last4` | modify |
| `app/api/payouts/request/route.ts` | select `frozen_balance` | modify |
| `vitest.config.ts`, `.env.example`, `.env.local`, `.claude/rules/env-vars.md` | `KYC_ENCRYPTION_KEY` plumbing/docs | modify |
| `types/database.types.ts` | regenerate after migration | regenerate |
| `.claude/rules/api-routes.md`, `.claude/todo-later/11(left)-…overhaul.md` | docs | modify |

---

## Task 1: KYC encryption key — env + test plumbing

**Files:**
- Modify: `.env.local` (real key, gitignored), `.env.example` (placeholder), `.claude/rules/env-vars.md`, `vitest.config.ts`

- [ ] **Step 1: Generate a real 32-byte key and put it in `.env.local`**

Run:
```bash
node -e "console.log('KYC_ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('base64'))"
```
Append the printed line to `.env.local`. (Also add the same key to the Vercel project env for `KYC_ENCRYPTION_KEY`, Production + Preview, before deploying Task 4.)

- [ ] **Step 2: Add a placeholder to `.env.example`**

Add this line under the Supabase/secret section of `.env.example`:
```
# Server-only. base64-encoded 32 bytes (AES-256) for KYC PII at-rest encryption. Generate: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
KYC_ENCRYPTION_KEY=
```

- [ ] **Step 3: Document it in `.claude/rules/env-vars.md`**

In the Supabase table (or a new "KYC" row group), add:
```
| `KYC_ENCRYPTION_KEY` | **secret** | `src/lib/server/kyc-crypto.ts` (KYC PII encryption), `app/api/kyc/submit` | base64 32 bytes (AES-256). Server-only. Rotating it requires re-encrypting existing `creator_kyc._enc` values. |
```

- [ ] **Step 4: Give Vitest a key so `kyc-crypto`/`kyc-row` tests can run**

In `vitest.config.ts`, inside the existing `test: { … }` block, add an `env` entry (merge — don't remove `environment`/`include`):
```ts
test: {
  environment: 'node',
  include: ['{src,app,lib}/**/*.test.{ts,tsx}'],
  env: {
    // Dummy 32-byte key for tests only (NOT a secret). Real key lives in .env.local / Vercel.
    KYC_ENCRYPTION_KEY: 'YWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWE=',
  },
},
```

- [ ] **Step 5: Commit**
```bash
git add .env.example .claude/rules/env-vars.md vitest.config.ts
git commit -m "chore(kyc): document + wire KYC_ENCRYPTION_KEY for encryption-at-rest

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Lock in the sound existing foundation

The uncommitted `kyc-crypto.ts` and `balance.ts` (+ tests) are correct as-is. Verify and commit them as the baseline before building on top.

**Files:**
- Commit: `src/lib/server/kyc-crypto.ts`, `src/lib/server/kyc-crypto.test.ts`, `src/lib/shared/balance.ts`, `src/lib/shared/balance.test.ts`

- [ ] **Step 1: Run the existing tests**

Run: `npm test -- src/lib/server/kyc-crypto.test.ts src/lib/shared/balance.test.ts`
Expected: PASS (kyc-crypto round-trip/tamper/last4; availableBalance incl. frozen). If kyc-crypto fails with "KYC_ENCRYPTION_KEY is not set", re-check Task 1 Step 4.

- [ ] **Step 2: Commit**
```bash
git add src/lib/server/kyc-crypto.ts src/lib/server/kyc-crypto.test.ts src/lib/shared/balance.ts src/lib/shared/balance.test.ts
git commit -m "feat(money): KYC PII encryption + shared availableBalance helper (Phase 0 foundation)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: `buildEncryptedKycRow` pure helper (TDD)

The testable seam for the route: takes raw client input, returns the exact `creator_kyc` column set — forcing `status='pending'`, dropping every verification/admin field, encrypting PII.

**Files:**
- Create: `src/lib/server/kyc-row.ts`
- Test: `src/lib/server/kyc-row.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/server/kyc-row.test.ts
import { describe, it, expect } from 'vitest';
import { buildEncryptedKycRow } from './kyc-row';
import { isEncrypted, decryptField } from './kyc-crypto';

const base = {
  legal_name: 'A B',
  pan: 'ABCDE1234F',
  bank_account: '1234567890',
  bank_account_name: 'A B',
  ifsc_code: 'hdfc0001234',
};

describe('buildEncryptedKycRow', () => {
  it('forces status=pending and kyc_level=basic regardless of input', () => {
    const row = buildEncryptedKycRow({ ...base, status: 'verified', kyc_level: 'full' });
    expect(row.status).toBe('pending');
    expect(row.kyc_level).toBe('basic');
  });

  it('drops verification/admin fields entirely', () => {
    const row = buildEncryptedKycRow({
      ...base, pan_verified: true, bank_verified: true, admin_notes: 'x', beneficiary_id: 'y',
    }) as Record<string, unknown>;
    expect(row.pan_verified).toBeUndefined();
    expect(row.bank_verified).toBeUndefined();
    expect(row.admin_notes).toBeUndefined();
    expect(row.beneficiary_id).toBeUndefined();
  });

  it('encrypts PAN and bank and exposes correct last4', () => {
    const row = buildEncryptedKycRow(base);
    expect(isEncrypted(row.pan_enc)).toBe(true);
    expect(decryptField(row.pan_enc)).toBe('ABCDE1234F');
    expect(row.pan_last4).toBe('234F');
    expect(isEncrypted(row.bank_account_enc)).toBe(true);
    expect(row.bank_last4).toBe('7890');
  });

  it('uppercases IFSC and maps empty UPI to null', () => {
    const row = buildEncryptedKycRow(base);
    expect(row.ifsc_code).toBe('HDFC0001234');
    expect(row.upi_id_enc).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/lib/server/kyc-row.test.ts`
Expected: FAIL with "Failed to resolve import './kyc-row'" / `buildEncryptedKycRow is not a function`.

- [ ] **Step 3: Implement the helper**

```ts
// src/lib/server/kyc-row.ts
// Pure builder: raw client KYC input -> the exact creator_kyc column set to upsert.
// Server-only (uses encryptField). Forces status='pending', drops all verification/admin
// fields by allowlisting, encrypts PAN/bank/UPI, exposes *_last4 for masked display.
import { encryptField, last4 } from './kyc-crypto';

const STR = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const NULLABLE = (v: unknown): string | null => {
  const s = STR(v);
  return s === '' ? null : s;
};

export interface EncryptedKycRow {
  legal_name: string;
  pan_enc: string;
  pan_last4: string;
  bank_account_enc: string;
  bank_last4: string;
  bank_account_name: string;
  ifsc_code: string;
  upi_id_enc: string | null;
  aadhaar_last4: string | null;
  dob: string | null;
  gender: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string;
  status: 'pending';
  kyc_level: 'basic';
}

export function buildEncryptedKycRow(input: Record<string, unknown>): EncryptedKycRow {
  const pan = STR(input.pan);
  const bank = STR(input.bank_account);
  const upi = STR(input.upi_id);
  return {
    legal_name: STR(input.legal_name),
    pan_enc: encryptField(pan),
    pan_last4: last4(pan),
    bank_account_enc: encryptField(bank),
    bank_last4: last4(bank),
    bank_account_name: STR(input.bank_account_name),
    ifsc_code: STR(input.ifsc_code).toUpperCase(),
    upi_id_enc: upi ? encryptField(upi) : null,
    aadhaar_last4: NULLABLE(input.aadhaar_last4),
    dob: NULLABLE(input.dob),
    gender: NULLABLE(input.gender),
    address_line1: NULLABLE(input.address_line1),
    address_line2: NULLABLE(input.address_line2),
    city: NULLABLE(input.city),
    state: NULLABLE(input.state),
    postal_code: NULLABLE(input.postal_code),
    country: STR(input.country) || 'India',
    status: 'pending',
    kyc_level: 'basic',
  };
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npm test -- src/lib/server/kyc-row.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**
```bash
git add src/lib/server/kyc-row.ts src/lib/server/kyc-row.test.ts
git commit -m "feat(kyc): pure buildEncryptedKycRow — allowlist, force pending, encrypt PII

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: `POST /api/kyc/submit` service-role route

**Files:**
- Create: `app/api/kyc/submit/route.ts`
- Modify: `.claude/rules/api-routes.md`

- [ ] **Step 1: Write the route**

```ts
// app/api/kyc/submit/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveProfileId } from '@/lib/server/resolve-profile';
import { buildEncryptedKycRow } from '@/lib/server/kyc-row';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const profileId = await resolveProfileId(user.id, user.email);
    if (!profileId) return NextResponse.json({ error: 'Creator profile not found.' }, { status: 404 });

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
    }

    const row = buildEncryptedKycRow(body);
    if (!row.legal_name || !row.pan_enc || !row.bank_account_enc || !row.ifsc_code) {
      return NextResponse.json({ error: 'legal_name, pan, bank_account and ifsc_code are required.' }, { status: 400 });
    }

    const db = createServiceClient();
    const { error } = await db
      .from('creator_kyc')
      .upsert({ creator_id: profileId, ...row }, { onConflict: 'creator_id' });
    if (error) {
      console.error('[kyc/submit] upsert failed', error.message);
      return NextResponse.json({ error: 'Failed to save KYC details.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[kyc/submit] error', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors. (Functional end-to-end verification happens in Task 5 once the form posts to it; the `upsert onConflict: 'creator_id'` depends on the unique constraint added in Task 7's migration — that's why the lockdown migration is applied after this route ships but the constraint is idempotently ensured there.)

- [ ] **Step 3: Document the route in `.claude/rules/api-routes.md`**

In the "At a glance" table add:
```
| POST | `/api/kyc/submit` | cookie session | server + service role | `creator_kyc` (forces status=pending, encrypts PAN/bank/UPI; never accepts *_verified/status from client) |
```
And add a short subsection under a KYC heading describing: forces `status='pending'`, allowlists fields via `buildEncryptedKycRow`, encrypts PII, stores only `*_last4` readable. Note that `creator_kyc` client writes are now blocked by RLS (Task 7).

- [ ] **Step 4: Commit**
```bash
git add app/api/kyc/submit/route.ts .claude/rules/api-routes.md
git commit -m "feat(kyc): service-role POST /api/kyc/submit (encrypted, status forced pending)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Point the client at the route (KYC write + balance read)

Replace the client `creator_kyc` upsert with a POST to the route, and switch the balance read onto the shared formula. Both edits are in `useEarnings.ts`; the form field renames are in `billing/page.tsx`.

**Files:**
- Modify: `src/hooks/commerce/useEarnings.ts`, `app/dashboard/settings/billing/page.tsx`

- [ ] **Step 1: Rewrite the `useEarnings` mutation + read**

In `src/hooks/commerce/useEarnings.ts`:

Add the import near the top:
```ts
import { availableBalance } from '@/lib/shared/balance';
```

Replace the `derivedBalance` block (currently lines ~28-31) with:
```ts
        const rawBal = balanceRes.data;
        const derivedBalance = rawBal
          ? { ...rawBal, available_balance: availableBalance(rawBal) }
          : { available_balance: 0, pending_payout: 0, total_earnings: 0, total_platform_fees: 0, total_paid_out: 0 };
```

Replace the entire `updateKycMutation` (currently lines ~45-57) with:
```ts
  const updateKycMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch('/api/kyc/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Failed to submit KYC details.');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['earnings', 'summary'] }),
  });
```
(`getCreatorProfileId` is still used by the query `queryFn` above — leave that import in place.)

- [ ] **Step 2: Send raw field names from the billing form**

In `app/dashboard/settings/billing/page.tsx`, replace the `handleSubmit` `updateKyc({...})` payload (currently lines ~176-194) with raw field names:
```ts
      await updateKyc({
        legal_name: form.legal_name,
        pan: form.pan,
        bank_account: form.bank_account,
        bank_account_name: form.bank_account_name,
        ifsc_code: form.ifsc_code,
        upi_id: form.upi_id || '',
        aadhaar_last4: form.aadhaar_last4 || null,
        dob: form.dob || null,
        gender: form.gender || null,
        address_line1: form.address_line1 || null,
        address_line2: form.address_line2 || null,
        city: form.city || null,
        state: form.state || null,
        postal_code: form.postal_code || null,
        country: form.country || 'India',
      });
```
Then rename the three PII fields in the form's `useState` initial object and their input bindings so the user types into raw fields, not `*_enc`. Find every occurrence and rename:
- `pan_enc` → `pan`
- `bank_account_enc` → `bank_account`
- `upi_id_enc` → `upi_id`

Run to locate them: `git grep -n "pan_enc\|bank_account_enc\|upi_id_enc" app/dashboard/settings/billing/page.tsx`
For the hydration `useEffect` (currently `setForm({ ...empty, ...kyc })`), the stored row no longer returns readable PII — display masked values instead by sourcing the inputs' placeholders from `kyc?.pan_last4` / `kyc?.bank_last4` and keeping the raw input fields empty on load (the creator re-enters to change). Leave the existing masked-reveal UI as-is.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual end-to-end verification**

Run: `npm run dev`. Log in as a creator, open `/dashboard/settings/billing`, submit the KYC form. Then verify the stored row is encrypted (no plaintext) via MCP `execute_sql` on project `qcendfisvyjnwmefruba`:
```sql
SELECT status,
       (pan_enc LIKE 'enc:v1:%') AS pan_encrypted,
       (bank_account_enc LIKE 'enc:v1:%') AS bank_encrypted,
       pan_last4, bank_last4
FROM public.creator_kyc
ORDER BY updated_at DESC NULLS LAST
LIMIT 3;
```
Expected: `status='pending'`, `pan_encrypted=true`, `bank_encrypted=true`, `*_last4` populated.

- [ ] **Step 5: Commit**
```bash
git add src/hooks/commerce/useEarnings.ts app/dashboard/settings/billing/page.tsx
git commit -m "feat(kyc): client submits KYC via /api/kyc/submit; balance read uses shared formula

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Backfill — encrypt the one existing plaintext row

**Files:**
- Create: `scripts/backfill-encrypt-kyc.ts`

- [ ] **Step 1: Write the script**

```ts
// scripts/backfill-encrypt-kyc.ts
// One-off: encrypt any plaintext creator_kyc PII in place + populate *_last4.
// Idempotent — skips values already in enc:v1 form. Reads PII only in-process; never logs raw values.
// Run: npx tsx scripts/backfill-encrypt-kyc.ts   (requires KYC_ENCRYPTION_KEY + SUPABASE_SERVICE_KEY in env)
import { createServiceClient } from '../src/lib/supabase/service';
import { encryptField, isEncrypted, last4 } from '../src/lib/server/kyc-crypto';

async function main() {
  const db = createServiceClient();
  const { data: rows, error } = await db
    .from('creator_kyc')
    .select('creator_id, pan_enc, bank_account_enc, upi_id_enc');
  if (error) throw error;

  let updated = 0;
  for (const row of rows ?? []) {
    const patch: Record<string, string> = {};
    if (row.pan_enc && !isEncrypted(row.pan_enc)) {
      patch.pan_enc = encryptField(row.pan_enc);
      patch.pan_last4 = last4(row.pan_enc);
    }
    if (row.bank_account_enc && !isEncrypted(row.bank_account_enc)) {
      patch.bank_account_enc = encryptField(row.bank_account_enc);
      patch.bank_last4 = last4(row.bank_account_enc);
    }
    if (row.upi_id_enc && !isEncrypted(row.upi_id_enc)) {
      patch.upi_id_enc = encryptField(row.upi_id_enc);
    }
    if (Object.keys(patch).length === 0) continue;
    const { error: upErr } = await db.from('creator_kyc').update(patch).eq('creator_id', row.creator_id);
    if (upErr) throw upErr;
    updated++;
  }
  console.log(`[backfill-encrypt-kyc] encrypted ${updated} row(s).`);
}

main().then(() => process.exit(0)).catch((e) => { console.error('[backfill-encrypt-kyc] FAILED:', e.message); process.exit(1); });
```

- [ ] **Step 2: Run it once**

Run: `npx tsx scripts/backfill-encrypt-kyc.ts`
Expected: `[backfill-encrypt-kyc] encrypted 1 row(s).` (If Task 5's manual test already resubmitted that creator's KYC, the row is already encrypted and you'll see `0 row(s)` — both are correct.)

- [ ] **Step 3: Verify no plaintext remains**

MCP `execute_sql` on `qcendfisvyjnwmefruba`:
```sql
SELECT count(*) AS plaintext_remaining
FROM public.creator_kyc
WHERE (pan_enc IS NOT NULL AND pan_enc <> '' AND pan_enc NOT LIKE 'enc:v1:%')
   OR (bank_account_enc IS NOT NULL AND bank_account_enc <> '' AND bank_account_enc NOT LIKE 'enc:v1:%')
   OR (upi_id_enc IS NOT NULL AND upi_id_enc <> '' AND upi_id_enc NOT LIKE 'enc:v1:%');
```
Expected: `plaintext_remaining = 0`.

- [ ] **Step 4: Commit**
```bash
git add scripts/backfill-encrypt-kyc.ts
git commit -m "chore(kyc): one-off backfill to encrypt existing plaintext KYC PII

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Rewrite the migration (corrected, do not apply yet)

Fix the apply-breaker (`record_hash` text→bytea), populate `payout_id`, ensure the `creator_kyc` unique constraint the route's upsert needs, and drop the dead pg_cron scheduling (deferred to Phase 1).

**Files:**
- Modify: `supabase/migrations/20260630000000_phase0_money_hardening.sql`

- [ ] **Step 0: Confirm no code reads the old payout status labels**

Run: `git grep -nE "'(initiated|processed)'" -- 'app/**' 'src/**'`
Expected: no hits that refer to `creator_payouts.status`. If any exist (e.g. a payout list UI mapping `'processed'`), note them — they must move to `'success'`/`'processing'` before the new vocab is relied on. (Payouts are unwired today, so this is expected to be empty.)

- [ ] **Step 1: Replace the file with the corrected migration**

```sql
-- Phase 0 — Money-path hardening (2026-06-30)
-- Spec: docs/superpowers/specs/2026-06-30-phase0-money-hardening-design.md
-- Idempotent: safe to re-run. Apply live via the Supabase MCP, then `npm run update-types` (MCP fallback on Windows).

-- ── 1. KYC write-lockdown ──────────────────────────────────────────────────
-- Creator self-attesting status/*_verified was a payout-gate bypass. Drop client INSERT/UPDATE;
-- keep SELECT-own. Writes are service-role only (POST /api/kyc/submit forces status='pending').
drop policy if exists creator_kyc_insert_own on public.creator_kyc;
drop policy if exists creator_kyc_update_own on public.creator_kyc;
comment on table public.creator_kyc is
  'KYC profile. Creators may only SELECT their own row. All writes go through service-role POST /api/kyc/submit (forces status=pending, never accepts *_verified from the client). Admin verification flips status/*_verified via a service-role admin route (Phase 2).';

-- Ensure a unique target for the route''s upsert(onConflict: creator_id).
do $$
begin
  if not exists (
    select 1 from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public' and t.relname = 'creator_kyc' and c.contype = 'u'
      and pg_get_constraintdef(c.oid) ilike '%(creator_id)%'
  ) then
    alter table public.creator_kyc add constraint uq_creator_kyc_creator_id unique (creator_id);
  end if;
end $$;

-- ── 2. creator_balances.frozen_balance ─────────────────────────────────────
alter table public.creator_balances
  add column if not exists frozen_balance numeric not null default 0;
alter table public.creator_balances drop constraint if exists chk_creator_balances_nonneg;
alter table public.creator_balances add constraint chk_creator_balances_nonneg
  check (total_earnings >= 0 and total_platform_fees >= 0 and total_paid_out >= 0
         and pending_payout >= 0 and frozen_balance >= 0);

-- ── 3. creator_payouts.status vocabulary ───────────────────────────────────
-- Lifecycle: pending → processing → success → failed. (Table empty; sole writer inserts 'pending'.)
alter table public.creator_payouts drop constraint if exists creator_payouts_status_check;
alter table public.creator_payouts add constraint creator_payouts_status_check
  check (status in ('pending','processing','success','failed'));

-- ── 4. settle_payout() — atomic payout finalization ────────────────────────
-- Idempotency: the status claim (WHERE status in ('pending','processing')) gates side effects;
-- the ledger record_hash UNIQUE constraint is a second guard. record_hash is bytea and must
-- match fulfillment.ts's convention: the ASCII bytes of the lowercase hex SHA-256 (built-in
-- sha256(), no pgcrypto). Returns true iff it transitioned a row.
create or replace function public.settle_payout(
  p_payout_id uuid,
  p_terminal text,                       -- 'success' | 'failed'
  p_gateway_payout_id text default null,
  p_gateway_metadata jsonb default null,
  p_failure_reason text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_creator_id uuid;
  v_amount numeric;
begin
  if p_terminal not in ('success','failed') then
    raise exception 'settle_payout: invalid terminal status %', p_terminal;
  end if;

  update public.creator_payouts
     set status            = p_terminal,
         gateway_payout_id = coalesce(p_gateway_payout_id, gateway_payout_id),
         gateway_metadata  = coalesce(p_gateway_metadata, gateway_metadata),
         failure_reason    = case when p_terminal = 'failed' then p_failure_reason else failure_reason end
   where id = p_payout_id
     and status in ('pending','processing')
   returning creator_id, amount into v_creator_id, v_amount;

  if v_creator_id is null then
    return false;  -- already settled / not found → no-op
  end if;

  if p_terminal = 'success' then
    update public.creator_balances
       set total_paid_out = total_paid_out + v_amount,
           pending_payout = greatest(pending_payout - v_amount, 0)
     where creator_id = v_creator_id;

    insert into public.transaction_ledger
      (creator_id, payout_id, amount, direction, tx_type, currency, record_hash, meta)
    values
      (v_creator_id, p_payout_id, v_amount, 'debit', 'payout', 'INR',
       convert_to(encode(sha256(convert_to('payout:' || p_payout_id::text, 'UTF8')), 'hex'), 'UTF8'),
       jsonb_build_object('payout_id', p_payout_id, 'gateway_payout_id', p_gateway_payout_id))
    on conflict (record_hash) do nothing;
  else
    update public.creator_balances
       set pending_payout = greatest(pending_payout - v_amount, 0)
     where creator_id = v_creator_id;
  end if;

  return true;
end;
$$;
revoke execute on function public.settle_payout(uuid, text, text, jsonb, text) from public, anon, authenticated;

-- ── 5. Reconciliation (alert-only; unscheduled — scheduler deferred to Phase 1) ──
create table if not exists public.balance_reconciliation_log (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references public.profiles(id) on delete cascade,
  field text not null,                 -- 'total_paid_out' | 'pending_payout'
  cached_value numeric not null,
  expected_value numeric not null,
  drift numeric not null,
  created_at timestamptz not null default now()
);
alter table public.balance_reconciliation_log enable row level security;
drop policy if exists balance_reconciliation_log_admin_select on public.balance_reconciliation_log;
create policy balance_reconciliation_log_admin_select on public.balance_reconciliation_log
  for select to authenticated using ((select public.is_super_admin()));

-- Compares cached creator_balances against authoritative creator_payouts sums; logs drift.
-- NEVER auto-corrects (money never silently rewrites itself). Run manually via MCP for now;
-- a scheduler (Vercel Cron or pg_cron) is chosen in Phase 1 when payouts start moving money.
create or replace function public.reconcile_creator_balances()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_expected_paid numeric;
  v_expected_pending numeric;
  v_drift_count integer := 0;
begin
  for r in select creator_id, total_paid_out, pending_payout from public.creator_balances loop
    select coalesce(sum(amount) filter (where status = 'success'), 0),
           coalesce(sum(amount) filter (where status in ('pending','processing')), 0)
      into v_expected_paid, v_expected_pending
      from public.creator_payouts
     where creator_id = r.creator_id;

    if r.total_paid_out <> v_expected_paid then
      insert into public.balance_reconciliation_log (creator_id, field, cached_value, expected_value, drift)
      values (r.creator_id, 'total_paid_out', r.total_paid_out, v_expected_paid, r.total_paid_out - v_expected_paid);
      v_drift_count := v_drift_count + 1;
    end if;

    if r.pending_payout <> v_expected_pending then
      insert into public.balance_reconciliation_log (creator_id, field, cached_value, expected_value, drift)
      values (r.creator_id, 'pending_payout', r.pending_payout, v_expected_pending, r.pending_payout - v_expected_pending);
      v_drift_count := v_drift_count + 1;
    end if;
  end loop;
  return v_drift_count;
end;
$$;
revoke execute on function public.reconcile_creator_balances() from public, anon, authenticated;
```

- [ ] **Step 2: Commit (file only — not applied yet)**
```bash
git add supabase/migrations/20260630000000_phase0_money_hardening.sql
git commit -m "fix(migration): correct settle_payout record_hash (bytea), payout_id, kyc unique; drop dead pg_cron

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: Apply the migration to live + verify the money RPCs

Apply via MCP, then prove `settle_payout` actually inserts the ledger debit (this is where the old bytea bug would have surfaced) using a fully-reversible ₹1 test on a real creator, and prove reconciliation logs-but-never-corrects.

**Files:** none (DB operations via MCP)

- [ ] **Step 1: Apply the migration**

Call MCP `mcp__plugin_supabase_supabase__apply_migration` with `project_id: qcendfisvyjnwmefruba`, `name: phase0_money_hardening`, and `query` = the full contents of `supabase/migrations/20260630000000_phase0_money_hardening.sql`.
Expected: success. Then sanity-check via `execute_sql`:
```sql
SELECT
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='creator_balances' AND column_name='frozen_balance') AS frozen_col,
  EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='settle_payout') AS settle_fn,
  (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='creator_kyc' AND cmd IN ('INSERT','UPDATE')) AS kyc_write_policies;
```
Expected: `frozen_col=true`, `settle_fn=true`, `kyc_write_policies=0`.

- [ ] **Step 2: Verify `settle_payout` success path (reversible, nets to zero)**

Run via `execute_sql`, one statement at a time, substituting the captured ids. First pick a real creator and record baseline:
```sql
SELECT creator_id, pending_payout, total_paid_out FROM public.creator_balances LIMIT 1;
-- note creator_id = :C, pending0, paid0
```
Seed a ₹1 payout and simulate the request hold:
```sql
INSERT INTO public.creator_payouts (creator_id, amount, currency, status)
VALUES (':C', 1, 'INR', 'pending') RETURNING id;   -- note payout id = :P
UPDATE public.creator_balances SET pending_payout = pending_payout + 1 WHERE creator_id = ':C';
```
Settle and assert:
```sql
SELECT public.settle_payout(':P', 'success');       -- expect: true
SELECT pending_payout, total_paid_out FROM public.creator_balances WHERE creator_id = ':C';
-- expect: pending_payout = pending0 (released), total_paid_out = paid0 + 1
SELECT count(*) AS debit_rows FROM public.transaction_ledger
 WHERE payout_id = ':P' AND tx_type = 'payout' AND direction = 'debit';   -- expect: 1
SELECT public.settle_payout(':P', 'success');       -- expect: false (idempotent no-op)
```
**Reverse to baseline (mandatory):**
```sql
DELETE FROM public.transaction_ledger WHERE payout_id = ':P';
DELETE FROM public.creator_payouts WHERE id = ':P';
UPDATE public.creator_balances SET total_paid_out = total_paid_out - 1 WHERE creator_id = ':C';
```
Confirm restored:
```sql
SELECT pending_payout, total_paid_out FROM public.creator_balances WHERE creator_id = ':C';  -- expect pending0, paid0
```

- [ ] **Step 3: Verify reconciliation logs drift without correcting**

```sql
-- Introduce a deliberate, isolated drift on the same real creator, then reconcile, then restore.
SELECT total_paid_out FROM public.creator_balances WHERE creator_id = ':C';  -- = paid0
UPDATE public.creator_balances SET total_paid_out = total_paid_out + 5 WHERE creator_id = ':C';
SELECT public.reconcile_creator_balances();  -- expect: >= 1
SELECT field, cached_value, expected_value, drift FROM public.balance_reconciliation_log
 WHERE creator_id = ':C' ORDER BY created_at DESC LIMIT 2;  -- expect a total_paid_out row, drift = 5
SELECT total_paid_out FROM public.creator_balances WHERE creator_id = ':C';  -- expect STILL paid0 + 5 (NOT auto-corrected)
-- restore + clean the test log rows
UPDATE public.creator_balances SET total_paid_out = total_paid_out - 5 WHERE creator_id = ':C';
DELETE FROM public.balance_reconciliation_log WHERE creator_id = ':C';
```
Expected: reconcile returns ≥1, a log row with `drift=5` exists, and the balance is unchanged by reconcile (proves alert-only).

- [ ] **Step 4: No commit** (DB-only task). Proceed to type regen.

---

## Task 9: Regenerate types from the live schema

**Files:**
- Regenerate: `types/database.types.ts`

- [ ] **Step 1: Generate + write types (Windows MCP fallback)**

Per `.claude/rules/supabase-reference.md`: call MCP `mcp__plugin_supabase_supabase__generate_typescript_types` (`project_id: qcendfisvyjnwmefruba`); the output is saved to a tool-results `.txt` wrapped as `{"types":"…"}`. Strip the envelope and write to `types/database.types.ts`:
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

- [ ] **Step 2: Confirm the new columns are present + consumers compile**

Run: `git grep -n "frozen_balance" types/database.types.ts`
Expected: at least one hit (in `creator_balances` Row/Insert/Update).
Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**
```bash
git add types/database.types.ts
git commit -m "chore(types): regenerate after phase0 migration (frozen_balance, payout status)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 10: Close the frozen-balance trap in the payout route

Now that `frozen_balance` is a typed column, make the payout route fetch it so the shared `availableBalance()` actually subtracts it (otherwise Phase 4's frozen funds would be withdrawable).

**Files:**
- Modify: `app/api/payouts/request/route.ts:44-45`

- [ ] **Step 1: Add `frozen_balance` to the balance select**

In `app/api/payouts/request/route.ts`, change the select (currently line ~45):
```ts
      .select('total_earnings, total_platform_fees, total_paid_out, pending_payout, frozen_balance')
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors (`frozen_balance` now exists on the row type from Task 9).

- [ ] **Step 3: Commit**
```bash
git add app/api/payouts/request/route.ts
git commit -m "fix(payouts): subtract frozen_balance in available-balance check

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 11: Final verification + doc state

**Files:**
- Modify: `.claude/todo-later/11(left)-2026-06-30-payments-earnings-payout-kyc-overhaul.md` (→ rename `11(half)`)

- [ ] **Step 1: Run the full local gauntlet**

Run: `npx tsc --noEmit`  → no errors
Run: `npm run lint`        → no new errors
Run: `npm test`            → all pass (balance, kyc-crypto, kyc-row)
Run: `/verify`             → rule checks on changed files pass

- [ ] **Step 2: Confirm the spec's §10 checklist**

Verify each item: client `creator_kyc` upsert is RLS-denied; no plaintext remains (Task 6 Step 3 query = 0); `settle_payout` success/failure/no-op behaved (Task 8); `availableBalance` identical in route + hook and route subtracts frozen; reconcile logs-not-corrects (Task 8 Step 3).

To confirm the gate-bypass is closed, run as an authenticated creator in the browser console on the dashboard (RLS-enforced anon client) and confirm it errors:
```js
const { error } = await window.supabase?.from('creator_kyc').update({ status: 'verified' }).eq('creator_id', '<own id>');
// expect: non-null error (RLS), status NOT changed
```
(If `window.supabase` isn't exposed, instead confirm via MCP that there are 0 INSERT/UPDATE policies on `creator_kyc` — already checked in Task 8 Step 1.)

- [ ] **Step 3: Update the blueprint Plan state + status tag**

In `.claude/todo-later/11(left)-2026-06-30-payments-earnings-payout-kyc-overhaul.md`, update the §0 Plan-state row for Phase 0 to `in progress → done` as appropriate and add the spec/plan links:
```
| 0 | Harden live: KYC lockdown + /api/kyc/submit, encrypted PII, settle_payout accounting, single balance formula, reconciliation (unscheduled) | done | spec: docs/superpowers/specs/2026-06-30-phase0-money-hardening-design.md · plan: docs/superpowers/plans/2026-06-30-phase0-money-hardening.md |
```
Also note in §0 that the reconciliation **scheduler** and the `settle_payout` **caller** are carried into Phase 1. Then rename the file to reflect progress per the CLAUDE.md todo-later convention:
```bash
git mv ".claude/todo-later/11(left)-2026-06-30-payments-earnings-payout-kyc-overhaul.md" ".claude/todo-later/11(half)-2026-06-30-payments-earnings-payout-kyc-overhaul.md"
git grep -n "11(left)-2026-06-30-payments" -- '*.md'   # fix any inline references the grep finds
```

- [ ] **Step 4: Commit**
```bash
git add -A
git commit -m "docs(phase0): mark money-hardening done, link spec+plan, bump todo status tag

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-review notes (addressed)

- **Spec coverage:** §4 A1–A5 → Tasks 1,3,4,5,6 + migration §1 (Task 7). B1–B5 → Tasks 7 (frozen/status/settle/reconcile), 10 (frozen select), 5 (useEarnings read). §6 apply order → task ordering (code Tasks 1–6 before migration apply Task 8). §8 testing → Tasks 2,3,8. §9 affected files all have tasks. §10 checklist → Task 11 Step 2.
- **Decisions honored:** reconciliation ships unscheduled (Task 7 §5 drops pg_cron); encrypt-in-place backfill (Task 6); `settle_payout` combined atomic RPC with corrected bytea hash (Task 7 §4); interim verify is manual super_admin (no task — out of Phase 0 scope, noted in spec).
- **Type consistency:** `buildEncryptedKycRow` signature/fields identical across Tasks 3, 4, 5; `settle_payout(uuid, text, text, jsonb, text)` consistent in Task 7 (def + revoke) and Task 8 (call uses the 2-arg defaulted form). `availableBalance` used in Task 5 (hook) matches the existing `src/lib/shared/balance.ts` export.
```
